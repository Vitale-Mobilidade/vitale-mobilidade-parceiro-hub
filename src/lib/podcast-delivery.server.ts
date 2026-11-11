import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildPodcastRss, podcastAudioPath, type ReleasedPodcastEpisode } from "./podcast-rss";
import type { PodcastArticle } from "./podcast-editorial";
import { PODCAST_MEDIA_EDGE } from "../../supabase/functions/_shared/podcast-media-contract";

const db: SupabaseClient = supabaseAdmin;
const noStore = { "Cache-Control": "no-store" };

export async function servePodcastFeed(head: boolean) {
  const { data: settings, error: settingsError } = await db.from("podcast_distribution_settings")
    .select("feed_enabled,verification_email").eq("singleton", true).maybeSingle();
  if (settingsError) return new Response(null, { status: 503, headers: noStore });
  if (!settings?.feed_enabled) return new Response(null, { status: 404, headers: noStore });
  const headers = { ...noStore, "Content-Type": "application/rss+xml; charset=utf-8" };
  if (head) return new Response(null, { headers });
  const { data, error } = await db.from("podcast_released_episodes")
    .select("youtube_id,title,original_description,released_at,size_bytes")
    .order("released_at", { ascending: false }).order("youtube_id").limit(500);
  if (error) return new Response(null, { status: 503, headers: noStore });
  const episodes = (data ?? []) as ReleasedPodcastEpisode[];
  const articleReads = [];
  for (let index = 0; index < episodes.length; index += 100) {
    articleReads.push(db.from("editorial_articles")
      .select("video_id,slug,title,summary,og_image_url,updated_at")
      .eq("status", "published").not("slug", "is", null)
      .in("video_id", episodes.slice(index, index + 100).map((episode) => episode.youtube_id)));
  }
  const articles = new Map<string, PodcastArticle>();
  for (const { data: rows, error: articlesError } of await Promise.all(articleReads)) {
    if (articlesError) return new Response(null, { status: 503, headers: noStore });
    for (const row of rows ?? []) articles.set(row.video_id, row);
  }
  return new Response(buildPodcastRss(episodes, settings.verification_email, articles), { headers });
}

export async function servePodcastAudio(request: Request, youtubeId: string) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId))
    return new Response(null, { status: 404, headers: noStore });
  const { data, error } = await db.from("podcast_released_episodes")
    .select("object_path,size_bytes").eq("youtube_id", youtubeId).maybeSingle();
  if (error) return new Response(null, { status: 503, headers: noStore });
  if (!data) return new Response(null, { status: 404, headers: noStore });
  const baseHeaders = new Headers({
    ...noStore, "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes",
  });
  if (request.method === "HEAD") {
    baseHeaders.set("Content-Length", String(data.size_bytes));
    return new Response(null, { headers: baseHeaders });
  }
  const mediaPath = podcastAudioPath(youtubeId, data.size_bytes);
  const range = request.headers.get("Range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    baseHeaders.set("Content-Range", `bytes */${data.size_bytes}`);
    return new Response(null, { status: 416, headers: baseHeaders });
  }
  const location = mediaPath.startsWith("/podcast/episodios/")
    ? mediaPath : `${PODCAST_MEDIA_EDGE}/${encodeURIComponent(youtubeId)}`;
  return new Response(null, { status: 307, headers: { ...noStore, Location: location } });
}
