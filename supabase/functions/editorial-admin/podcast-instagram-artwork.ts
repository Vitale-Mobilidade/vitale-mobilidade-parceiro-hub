import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { COVER_BUCKET, inspectJpeg } from "../_shared/editorial-cover.ts";
import { PODCAST_ARTWORK_EDGE, preparedPodcastInstagramPath } from "../_shared/podcast-artwork-contract.ts";
import { instagramPodcastPost } from "../_shared/podcast-instagram.ts";

/** Existing episode only. No AI, queue insertion, square regeneration or history edit. */
export async function preparePodcastInstagramArtwork(db: SupabaseClient, youtubeId: string) {
  const episode = await db.from("podcast_episode_queue")
    .select("prepared_article_version,prepared_instagram_post").eq("youtube_id", youtubeId).maybeSingle();
  if (episode.error || !episode.data) throw new Error("podcast_instagram_episode_missing");
  const article = await db.from("editorial_articles")
    .select("id,slug,og_image_url,summary,blocks,updated_at").eq("video_id", youtubeId)
    .eq("status", "published").eq("updated_at", episode.data.prepared_article_version).maybeSingle();
  if (article.error || !article.data) throw new Error("podcast_instagram_article_version_changed");
  const version = String(Date.parse(article.data.updated_at));
  const path = preparedPodcastInstagramPath(article.data.id, version);
  const fallback = instagramPodcastPost(article.data);
  if (!path || !fallback) throw new Error("podcast_instagram_cover_or_summary_missing");
  const prior = episode.data.prepared_instagram_post;
  const caption = prior && typeof prior === "object" && typeof prior.caption === "string" && prior.caption.trim()
    ? prior.caption : fallback.caption;
  const image_url = `https://vitalemobilidade.com/podcast/capas/${article.data.slug}.ig4.jpg?layout=4&v=${version}`;
  const cached = await db.storage.from(COVER_BUCKET).download(path);
  let bytes: Uint8Array;
  if (cached.data) {
    if (cached.data.size > 8 * 1024 * 1024) throw new Error("podcast_instagram_cover_invalid");
    bytes = new Uint8Array(await cached.data.arrayBuffer());
  } else {
    const url = new URL(PODCAST_ARTWORK_EDGE);
    url.search = new URLSearchParams({ type: "podcast-cover", slug: article.data.slug, layout: "4", v: version }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(25_000), redirect: "error" });
    const length = Number(response.headers.get("content-length"));
    if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "image/jpeg" ||
      !Number.isSafeInteger(length) || length < 4 || length > 8 * 1024 * 1024)
      throw new Error(response.status === 422 ? "podcast_instagram_original_missing" : "podcast_instagram_cover_render_failed");
    bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length !== length) throw new Error("podcast_instagram_cover_invalid");
  }
  const dimensions = inspectJpeg(bytes);
  if (dimensions?.width !== 1080 || dimensions.height !== 1350) throw new Error("podcast_instagram_cover_invalid");
  if (!cached.data) {
    const upload = await db.storage.from(COVER_BUCKET).upload(path, bytes, { contentType: "image/jpeg", upsert: false });
    if (upload.error) throw new Error("podcast_instagram_cover_save_failed");
  }
  const post = { ...(prior && typeof prior === "object" && !Array.isArray(prior) ? prior : {}), image_url, caption };
  let write = db.from("podcast_episode_queue").update({ prepared_instagram_post: post })
    .eq("youtube_id", youtubeId).eq("prepared_article_version", article.data.updated_at);
  write = prior === null ? write.is("prepared_instagram_post", null) : write.eq("prepared_instagram_post", JSON.stringify(prior));
  const saved = await write.select("youtube_id").maybeSingle();
  if (saved.error || !saved.data) throw new Error("podcast_instagram_cover_record_failed");
  return post;
}