import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { InstagramRequestError, instagramPodcastPost, instagramPublisher, readInstagramSettings } from "../_shared/podcast-instagram.ts";
import { notifyPodcastError } from "./podcast-alert.ts";

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
}

export async function publishPodcastOnInstagram(db: SupabaseClient, retryEpisodeId?: string) {
  const { data: rawClaim, error } = retryEpisodeId
    ? await claimInstagramRetry(db, retryEpisodeId)
    : await db.rpc("claim_podcast_instagram").maybeSingle();
  if (error) throw new Error("podcast_instagram_claim_failed");
  if (!rawClaim) return { status: "unavailable" as const };
  const claim = rawClaim as PodcastInstagramClaim;
  const slotClosed = () => !retryEpisodeId && Date.now() >= Date.parse(claim.slot_at) + 5 * 60_000;

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
    const settings = readInstagramSettings((name) => Deno.env.get(name));
    if (!settings) throw new InstagramRequestError("not_configured", true);
    const instagram = instagramPublisher(settings);
    const account = await instagram.account();
    let container: string | null = claim.container_id;
    if (!container) {
      const episode = await db.from("podcast_episode_queue").select("prepared_instagram_post")
        .eq("youtube_id", claim.youtube_id).not("released_at", "is", null).maybeSingle();
      if (episode.error) throw new Error("podcast_instagram_article_read_failed");
      const post = episode.data?.prepared_instagram_post as ReturnType<typeof instagramPodcastPost>;
      if (!post || typeof post.caption !== "string" || typeof post.image_url !== "string" ||
        !post.image_url.startsWith("https://vitalemobilidade.com/podcast/capas/")) {
        throw new InstagramRequestError("podcast_instagram_draft_missing", true);
      }
      container = await instagram.create(account, post);
      // Reuse this container if Meta takes longer than one tick or a response is lost.
      await save({ container_id: container });
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
    const errorCode = failure instanceof InstagramRequestError ? failure.code : "request_unconfirmed";
    const status = failure instanceof InstagramRequestError && failure.terminal ? "failed" : "pending";
    await finish(status, { error_code: errorCode });
    if (status === "failed" && !retryEpisodeId) await notifyPodcastError(db, "Instagram", claim.slot_at, errorCode);
    return { status, code: errorCode };
  }
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
    .lte("slot_at", new Date(now - 5 * 60_000).toISOString())
    .or(`lease_until.is.null,lease_until.lte.${new Date(now).toISOString()}`)
    .select("youtube_id,claim_token,container_id,slot_at").maybeSingle();
}
