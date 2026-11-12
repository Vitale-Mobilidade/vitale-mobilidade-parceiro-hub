import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  podcastHistoryPage,
  PODCAST_HISTORY_PAGE_SIZE,
  PODCAST_QUEUE_DISPLAY_LIMIT,
  type PodcastDashboardItem,
  type PodcastDashboardSnapshot,
  type PodcastInstagramDraft,
} from "../_shared/podcast-dashboard-contract.ts";
import { podcastArticleSlug } from "../_shared/podcast-artwork-contract.ts";
import { validInstagramPermalink } from "../_shared/podcast-instagram.ts";
import { spotifyEpisodeId } from "../_shared/podcast-spotify.ts";

type Row = { youtube_id: string; title: string; release_at?: string | null; released_at?: string | null };

export async function readPodcastInstagramDrafts(db: SupabaseClient, rawPage: unknown) {
  const offset = podcastHistoryPage(rawPage) * PODCAST_HISTORY_PAGE_SIZE;
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data, error, count } = await db.from("podcast_instagram_deliveries")
    .select("youtube_id,scheduled_at,podcast_episode_queue!inner(title)", { count: "exact" })
    .eq("status", "pending").is("publish_attempted_at", null).lte("slot_at", cutoff)
    .not("podcast_episode_queue.released_at", "is", null)
    .not("podcast_episode_queue.prepared_instagram_post", "is", null)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("slot_at", { ascending: false }).order("youtube_id")
    .range(offset, offset + PODCAST_HISTORY_PAGE_SIZE - 1);
  if (error) throw new Error("podcast_instagram_drafts_read_failed");
  type DraftRow = { youtube_id: string; scheduled_at: string | null; podcast_episode_queue: { title: string } };
  const items: PodcastInstagramDraft[] = ((data ?? []) as unknown as DraftRow[]).map((row) => ({
    id: row.youtube_id, title: row.podcast_episode_queue.title, scheduledAt: row.scheduled_at,
  }));
  return { total: count ?? 0, items };
}

export async function readPodcastDashboard(db: SupabaseClient, rawPage: unknown): Promise<PodcastDashboardSnapshot> {
  const checkedAt = new Date().toISOString();
  const offset = podcastHistoryPage(rawPage) * PODCAST_HISTORY_PAGE_SIZE;
  const [settings, audio, ready, pending, prepared, released, windows] = await Promise.all([
    db.from("podcast_distribution_settings").select("feed_enabled,scheduler_enabled,instagram_enabled").eq("singleton", true).single(),
    db.from("podcast_video_audio").select("youtube_id", { count: "exact", head: true }),
    db.from("podcast_queue_candidates").select("youtube_id,title", { count: "exact" })
      .order("published_on", { ascending: false, nullsFirst: false })
      .order("uploaded_at", { ascending: false }).order("youtube_id").limit(PODCAST_QUEUE_DISPLAY_LIMIT),
    db.from("podcast_pending_preparation").select("youtube_id,title", { count: "exact" })
      .order("created_at").order("youtube_id").limit(PODCAST_QUEUE_DISPLAY_LIMIT),
    db.from("podcast_prepared_episodes").select("youtube_id,title", { count: "exact" })
      .order("position").limit(PODCAST_QUEUE_DISPLAY_LIMIT),
    db.from("podcast_episode_queue").select("youtube_id,title,release_at,released_at", { count: "exact" })
      .not("released_at", "is", null).order("released_at", { ascending: false }).order("youtube_id")
      .range(offset, offset + PODCAST_HISTORY_PAGE_SIZE - 1),
    db.rpc("podcast_upcoming_windows"),
  ]);
  if ([settings, audio, ready, pending, prepared, released, windows].some((result) => result.error) || !settings.data)
    throw new Error("podcast_dashboard_read_failed");
  const awaitingPreparation = [...pending.data ?? [], ...ready.data ?? []].slice(0, PODCAST_QUEUE_DISPLAY_LIMIT);
  const allRows = [...awaitingPreparation, ...prepared.data ?? [], ...released.data ?? []];
  const releasedIds = (released.data ?? []).map((row) => row.youtube_id);
  const [articles, spotify, instagram] = await Promise.all([
    allRows.length ? db.from("editorial_articles").select("video_id,slug")
      .in("video_id", [...new Set(allRows.map((row) => row.youtube_id))])
      .eq("status", "published").lte("published_at", checkedAt) : { data: [], error: null },
    releasedIds.length ? db.from("podcast_spotify_episodes").select("youtube_id,spotify_episode_id")
      .in("youtube_id", releasedIds) : { data: [], error: null },
    releasedIds.length ? db.from("podcast_instagram_deliveries").select("youtube_id,slot_at,status,permalink,publish_attempted_at")
      .in("youtube_id", releasedIds) : { data: [], error: null },
  ]);
  if (articles.error || spotify.error || instagram.error) throw new Error("podcast_dashboard_links_failed");
  const articleSlugs = new Map((articles.data ?? []).flatMap(({ video_id, slug }) =>
    typeof slug === "string" && slug.length <= 120 && podcastArticleSlug.test(slug) ? [[video_id, slug] as const] : []));
  const spotifyIds = new Map((spotify.data ?? []).flatMap(({ youtube_id, spotify_episode_id }) =>
    spotifyEpisodeId(spotify_episode_id) ? [[youtube_id, spotify_episode_id] as const] : []));
  const instagramResults = new Map<string, NonNullable<PodcastDashboardItem["instagram"]>>();
  for (const row of instagram.data ?? []) {
    if (!["pending", "published", "failed"].includes(row.status)) continue;
    const expired = Date.parse(checkedAt) >= Date.parse(row.slot_at) + 5 * 60_000;
    const status = row.status === "pending" && expired
      ? row.publish_attempted_at ? "unconfirmed" : "expired"
      : row.status;
    instagramResults.set(row.youtube_id, {
      status,
      permalink: validInstagramPermalink(row.permalink) ? row.permalink : null,
    });
  }
  function items(rows: Row[] | null): PodcastDashboardItem[] {
    return (rows ?? []).map((row) => ({
      id: row.youtube_id,
      title: row.title,
      articleSlug: articleSlugs.get(row.youtube_id) ?? null,
      slotAt: row.release_at ?? null,
      releasedAt: row.released_at ?? null,
      spotifyId: row.released_at ? spotifyIds.get(row.youtube_id) ?? null : null,
      instagram: instagramResults.get(row.youtube_id),
    }));
  }
  return {
    checkedAt,
    feedEnabled: settings.data.feed_enabled === true,
    schedulerEnabled: settings.data.scheduler_enabled === true,
    instagramEnabled: settings.data.instagram_enabled === true,
    audioCount: audio.count ?? 0,
    ready: { total: (ready.count ?? 0) + (pending.count ?? 0), items: items(awaitingPreparation) },
    prepared: { total: prepared.count ?? 0, items: items(prepared.data).map((item, index) => ({
      ...item,
      slotAt: settings.data.feed_enabled && settings.data.scheduler_enabled
        ? (windows.data as string[] | null)?.[index] ?? null : null,
    })) },
    released: { total: released.count ?? 0, items: items(released.data) },
  };
}
