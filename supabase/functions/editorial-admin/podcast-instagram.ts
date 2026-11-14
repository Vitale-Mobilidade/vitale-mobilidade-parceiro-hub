import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { InstagramRequestError, instagramPodcastPost, instagramPublisher, readInstagramSettings } from "../_shared/podcast-instagram.ts";
import { notifyPodcastError } from "./podcast-alert.ts";
import { preparePodcastInstagramArtwork } from "./podcast-instagram-artwork.ts";

export async function verifyPodcastInstagramConnection() {
  const settings = readInstagramSettings((name) => Deno.env.get(name));
  if (!settings) return { status: "not_configured" };
  const instagram = instagramPublisher(settings);
  try {
    const account = await instagram.account();
    await instagram.checkPublishingAccess(account);
    return { status: "verified" };
  } catch (failure) {
    return { status: failure instanceof InstagramRequestError ? failure.code : "meta_request" };
  }
}

interface PodcastInstagramClaim {
  youtube_id: string;
  claim_token: string;
  container_id: string | null;
  slot_at: string;
  scheduled_at?: string | null;
  publish_attempted_at?: string | null;
  error_code?: string | null;
}

export async function publishPodcastOnInstagram(db: SupabaseClient, mode?: { episodeId: string } | "scheduled") {
  const { data: rawClaim, error } = mode === "scheduled"
    ? await db.rpc("claim_scheduled_podcast_instagram").maybeSingle()
    : mode ? await claimInstagramRetry(db, mode.episodeId)
    : await db.rpc("claim_podcast_instagram").maybeSingle();
  if (error) throw new Error("podcast_instagram_claim_failed");
  if (!rawClaim) return { status: "unavailable" as const };
  const claim = rawClaim as PodcastInstagramClaim;
  if (claim.publish_attempted_at || claim.error_code === "meta_create_uncertain") {
    return { status: "unavailable" as const, code: "reconciliation_required" };
  }
  const slotClosed = () => mode === "scheduled"
    ? !claim.scheduled_at || Date.now() >= Date.parse(claim.scheduled_at) + 15 * 60_000
    : !mode && Date.now() >= Date.parse(claim.slot_at) + 5 * 60_000;

  async function save(values: Record<string, string | null>) {
    const { data, error: writeError } = await db.from("podcast_instagram_deliveries").update(values)
      .eq("youtube_id", claim.youtube_id).eq("claim_token", claim.claim_token)
      .select("youtube_id").maybeSingle();
    if (writeError || !data) throw new Error("podcast_instagram_record_failed");
  }
  async function finish(status: "published" | "failed" | "pending", details: Record<string, string | null>) {
    await save({ status, claim_token: null, lease_until: null, ...details });
  }

  try {
    const heldEpisode = await db.from("podcast_episode_queue").select("prepared_instagram_post")
      .eq("youtube_id", claim.youtube_id).maybeSingle();
    if (heldEpisode.error) throw new Error("podcast_instagram_draft_missing");
    if (heldEpisode.data?.prepared_instagram_post?.reviewHold === true) {
      await finish("pending", { error_code: "review_hold" });
      return { status: "unavailable" as const, code: "review_hold" };
    }
    const settings = readInstagramSettings((name) => Deno.env.get(name));
    if (!settings) throw new InstagramRequestError("not_configured", true);
    const instagram = instagramPublisher(settings);
    const account = await instagram.account();
    let container: string | null = claim.container_id;
    if (container) {
      const episode = await db.from("podcast_episode_queue").select("prepared_instagram_post")
        .eq("youtube_id", claim.youtube_id).maybeSingle();
      const post = episode.data?.prepared_instagram_post;
      if (episode.error || !post || typeof post.image_url !== "string" || !post.image_url.includes(".ig4.jpg?layout=4&"))
        throw new InstagramRequestError("podcast_instagram_legacy_container_reconcile", true);
    }
    if (!container) {
      const post = await preparePodcastInstagramArtwork(db, claim.youtube_id);
      if (!post || typeof post.caption !== "string" || typeof post.image_url !== "string" ||
        !post.image_url.startsWith("https://vitalemobilidade.com/podcast/capas/")) {
        throw new InstagramRequestError("podcast_instagram_draft_missing", true);
      }
      // Marker persists before paid/external side effect; uncertain create/save never replays.
      await save({ error_code: "meta_create_uncertain" });
      container = await instagram.create(account, post);
      // Reuse this container if Meta takes longer than one tick or a response is lost.
      await save({ container_id: container, error_code: null });
    }

    const status = await instagram.status(container);
    if (status === "PUBLISHED") {
      await finish("published", { published_at: new Date().toISOString(), error_code: null });
      return { status: "published" as const };
    }
    if (status === "EXPIRED" || status === "ERROR") throw new InstagramRequestError("meta_container_failed", true);
    if (status !== "FINISHED") {
      await finish("pending", { error_code: "meta_processing" });
      return { status: "pending" as const, code: "meta_processing" };
    }
    if (slotClosed()) {
      await finish("pending", { error_code: "slot_closed" });
      return { status: "pending" as const, code: "slot_closed" };
    }
    await save({ publish_attempted_at: new Date().toISOString() });
    if (slotClosed()) {
      await finish("pending", { error_code: "slot_closed" });
      return { status: "pending" as const, code: "slot_closed" };
    }
    const media = await instagram.publish(account, container);
    const permalink = await instagram.permalink(media).catch(() => null);
    await finish("published", { published_at: new Date().toISOString(), permalink, error_code: null });
    return { status: "published" as const };
  } catch (failure) {
    const createUncertain = !claim.container_id && (
      failure instanceof InstagramRequestError && /^meta_create_(transport|response)$|^meta_container_missing$/.test(failure.code)
      || failure instanceof Error && failure.message === "podcast_instagram_record_failed"
    );
    const errorCode = createUncertain ? "meta_create_uncertain" : failure instanceof InstagramRequestError
      ? failure.code : failure instanceof Error && /^podcast_instagram_/.test(failure.message) ? failure.message : "request_unconfirmed";
    const status = failure instanceof InstagramRequestError && failure.terminal ? "failed" : "pending";
    await finish(status, { error_code: errorCode });
    if (mode === "scheduled" || (status === "failed" && !mode)) {
      await notifyPodcastError(db, "Instagram", claim.scheduled_at ?? claim.slot_at, errorCode);
    }
    return { status, code: errorCode };
  }
}

export async function publishScheduledPodcastInstagram(db: SupabaseClient) {
  const results = await Promise.all(Array.from({ length: 3 }, () => publishPodcastOnInstagram(db, "scheduled")));
  return { status: "instagram-schedule", published: results.filter((result) => result.status === "published").length };
}

async function claimInstagramRetry(db: SupabaseClient, episodeId: string) {
  const settings = await db.from("podcast_distribution_settings")
    .select("feed_enabled,instagram_enabled").eq("singleton", true).maybeSingle();
  if (settings.error || !settings.data?.feed_enabled || !settings.data.instagram_enabled) {
    return { data: null, error: settings.error };
  }
  const now = Date.now();
  return await db.from("podcast_instagram_deliveries")
    .update({ claim_token: crypto.randomUUID(), lease_until: new Date(now + 60_000).toISOString() })
    .eq("youtube_id", episodeId).eq("status", "pending").is("publish_attempted_at", null)
    .or("error_code.is.null,error_code.neq.meta_create_uncertain")
    .lte("slot_at", new Date(now - 5 * 60_000).toISOString())
    .or(`lease_until.is.null,lease_until.lte.${new Date(now).toISOString()}`)
    .select("youtube_id,claim_token,container_id,slot_at,publish_attempted_at,error_code").maybeSingle();
}
