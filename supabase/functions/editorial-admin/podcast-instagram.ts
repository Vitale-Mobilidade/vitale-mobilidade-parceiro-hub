import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { InstagramRequestError, instagramPodcastPost, instagramPublisher, readInstagramSettings } from "../_shared/podcast-instagram.ts";

export async function verifyPodcastInstagramConnection() {
  const settings = readInstagramSettings((name) => Deno.env.get(name));
  if (!settings) return { status: "not_configured" };
  const instagram = instagramPublisher(settings);
  try {
    await instagram.account();
    return { status: "verified" };
  } catch (failure) {
    return { status: failure instanceof InstagramRequestError ? failure.code : "meta_request" };
  }
}

export async function publishPodcastOnInstagram(db: SupabaseClient) {
  const { data: claim, error } = await db.rpc("claim_podcast_instagram").maybeSingle();
  if (error) throw new Error("podcast_instagram_claim_failed");
  if (!claim) return false;

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
      const [episode, article] = await Promise.all([
        db.from("podcast_released_episodes").select("title").eq("youtube_id", claim.youtube_id).maybeSingle(),
        db.from("editorial_articles").select("slug,summary,og_image_url,updated_at")
          .eq("video_id", claim.youtube_id).eq("status", "published").lte("published_at", new Date().toISOString()).maybeSingle(),
      ]);
      if (episode.error || article.error) throw new Error("podcast_instagram_article_read_failed");
      const post = episode.data && article.data ? instagramPodcastPost(episode.data.title, article.data) : null;
      if (!post) throw new InstagramRequestError("cover_or_summary_missing", true);
      container = await instagram.create(account, post);
      // Reuse this container if Meta takes longer than one tick or a response is lost.
      await save({ container_id: container });
    }

    const status = await instagram.status(container);
    if (status === "PUBLISHED") {
      await finish("published", { published_at: new Date().toISOString(), error_code: null });
      return true;
    }
    if (status === "EXPIRED" || status === "ERROR") throw new InstagramRequestError("meta_container_failed", true);
    if (status !== "FINISHED") {
      await finish("pending", { error_code: "meta_processing" });
      return true;
    }
    if (Date.now() >= Date.parse(claim.slot_at) + 5 * 60_000) {
      await finish("pending", { error_code: "slot_closed" });
      return true;
    }
    await save({ publish_attempted_at: new Date().toISOString() });
    if (Date.now() >= Date.parse(claim.slot_at) + 5 * 60_000) {
      await finish("pending", { error_code: "slot_closed" });
      return true;
    }
    const media = await instagram.publish(account, container);
    const permalink = await instagram.permalink(media).catch(() => null);
    await finish("published", { published_at: new Date().toISOString(), permalink, error_code: null });
  } catch (failure) {
    const errorCode = failure instanceof InstagramRequestError ? failure.code : "request_unconfirmed";
    const status = failure instanceof InstagramRequestError && failure.terminal ? "failed" : "pending";
    await finish(status, { error_code: errorCode });
  }
  return true;
}
