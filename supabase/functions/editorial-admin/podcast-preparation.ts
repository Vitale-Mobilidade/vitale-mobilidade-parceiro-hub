import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { COVER_BUCKET, inspectJpeg } from "../_shared/editorial-cover.ts";
import { PODCAST_ARTWORK_EDGE, preparedPodcastCoverPath } from "../_shared/podcast-artwork-contract.ts";
import { PODCAST_AUDIO_BUCKET } from "../_shared/podcast-audio-contract.ts";
import { notifyPodcastError } from "./podcast-alert.ts";
import { prepareNextPodcastEpisode, previewPodcastQueue, stageNextPodcastEpisode } from "./podcast-queue.ts";

const QUEUE_TARGET = 6;
const MAX_COVER_BYTES = 8 * 1024 * 1024;

export async function preparePodcastDraft(db: SupabaseClient, youtubeId: string) {
  const attempt = await db.from("podcast_episode_queue").update({ preparation_attempted_at: new Date().toISOString() })
    .eq("youtube_id", youtubeId).is("released_at", null);
  if (attempt.error) throw new Error("podcast_queue_write_failed");
  const [article, episode] = await Promise.all([
    db.from("editorial_articles").select("id,slug,summary,og_image_url,updated_at")
      .eq("video_id", youtubeId).eq("status", "published").lte("published_at", new Date().toISOString()).maybeSingle(),
    db.from("podcast_episode_queue").select("object_path").eq("youtube_id", youtubeId).is("released_at", null).maybeSingle(),
  ]);
  if (article.error || episode.error) throw new Error("podcast_queue_read_failed");
  if (!episode.data || !article.data) throw new Error("podcast_article_unavailable");
  const version = String(Date.parse(article.data.updated_at));
  const path = preparedPodcastCoverPath(article.data.id, version);
  if (!article.data.slug || !path) throw new Error("podcast_cover_missing");
  const audio = await db.storage.from(PODCAST_AUDIO_BUCKET).info(episode.data.object_path);
  if (audio.error || !audio.data) throw new Error("podcast_queue_audio_missing");

  const url = new URL(PODCAST_ARTWORK_EDGE);
  url.search = new URLSearchParams({ type: "podcast-cover", slug: article.data.slug, layout: "3", v: version }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000), redirect: "error" })
    .catch(() => { throw new Error("podcast_cover_render_failed"); });
  const length = Number(response.headers.get("content-length"));
  if (!response.ok || response.headers.get("content-type")?.split(";")[0] !== "image/jpeg" ||
    !Number.isSafeInteger(length) || length < 4 || length > MAX_COVER_BYTES)
    throw new Error("podcast_cover_render_failed");
  const bytes = new Uint8Array(await response.arrayBuffer());
  const dimensions = inspectJpeg(bytes);
  if (bytes.length !== length || dimensions?.width !== 1400 || dimensions.height !== 1400)
    throw new Error("podcast_cover_render_failed");
  const upload = await db.storage.from(COVER_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg", upsert: true,
  });
  if (upload.error) throw new Error("podcast_cover_save_failed");

  const updated = await db.from("podcast_episode_queue").update({
    prepared_article_version: article.data.updated_at, prepared_cover_path: path,
  }).eq("youtube_id", youtubeId).is("released_at", null);
  if (updated.error) throw new Error("podcast_queue_write_failed");
}

export async function fillPreparedPodcastQueue(
  db: SupabaseClient, actor: { id: string; role: string }, readDescription: (id: string) => Promise<string>,
  checkForNewer = false,
) {
  const ready = await db.from("podcast_prepared_episodes")
    .select("youtube_id,published_on,source_folder_created_at").order("position").limit(QUEUE_TARGET);
  if (ready.error) throw new Error("podcast_queue_read_failed");
  const readyIds = new Set((ready.data ?? []).map(({ youtube_id }) => youtube_id));
  const first = ready.data?.[0];
  if (readyIds.size >= QUEUE_TARGET && !checkForNewer) return readyIds.size;

  async function prepare(id: string) {
    try {
      await preparePodcastDraft(db, id);
      readyIds.add(id);
    } catch (error) {
      await notifyPodcastError(db, "preparação", id, error);
    }
  }

  if (readyIds.size < QUEUE_TARGET) {
    const drafts = await db.from("podcast_pending_preparation").select("youtube_id")
      .order("preparation_attempted_at", { ascending: true, nullsFirst: true })
      .order("created_at").order("youtube_id").limit(1);
    if (drafts.error) throw new Error("podcast_queue_read_failed");
    const unfinished = drafts.data?.[0];
    if (unfinished) await prepare(unfinished.youtube_id);
    if (readyIds.size >= QUEUE_TARGET) return readyIds.size;
  }

  // Keep one WorkDrive import per run, so preparation cannot overrun the release window.
  const aheadOf = readyIds.size >= QUEUE_TARGET && first
    ? { publishedOn: first.published_on, folderCreatedAt: first.source_folder_created_at } : undefined;
  const staged = await prepareNextPodcastEpisode(db, actor, readDescription, { useAttachedWithoutWorkDrive: true, aheadOf })
    .catch(async (error: unknown) => {
      if (!(error instanceof Error) || !/^(podcast_)?workdrive_/.test(error.message)) throw error;
      const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
      await notifyPodcastError(db, "preparação", day, error);
      if (aheadOf) return { status: "empty" };
      const { candidates } = await previewPodcastQueue(db);
      return candidates[0] ? stageNextPodcastEpisode(db, candidates[0].youtube_id, readDescription) : { status: "empty" };
    });
  if (staged.status === "draft" && "youtubeId" in staged && typeof staged.youtubeId === "string") {
    await prepare(staged.youtubeId);
  } else if (staged.status !== "empty" && staged.status !== "queue_changed") {
    throw new Error("podcast_queue_preparation_failed");
  }
  return readyIds.size;
}
