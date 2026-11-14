import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  podcastHistoryPage,
  PODCAST_HISTORY_PAGE_SIZE,
  PODCAST_QUEUE_DISPLAY_LIMIT,
  PODCAST_INSTAGRAM_REVIEW_VIDEO,
  type PodcastDashboardItem,
  type PodcastDashboardSnapshot,
  type PodcastInstagramDraft,
  type PodcastInstagramDraftsSnapshot,
  type PodcastInstagramPost,
  type PodcastInstagramPostsSnapshot,
  podcastInstagramPostState,
} from "../_shared/podcast-dashboard-contract.ts";
import { podcastArticleSlug } from "../_shared/podcast-artwork-contract.ts";
import { validInstagramPermalink } from "../_shared/podcast-instagram.ts";
import { spotifyEpisodeId } from "../_shared/podcast-spotify.ts";

type Row = { youtube_id: string; title: string; release_at?: string | null; released_at?: string | null };

export async function readPodcastInstagramPosts(db: SupabaseClient, rawPage: unknown): Promise<PodcastInstagramPostsSnapshot> {
  const offset = podcastHistoryPage(rawPage) * PODCAST_HISTORY_PAGE_SIZE;
  const [queue, settings, prepared, windows] = await Promise.all([
    db.from("podcast_episode_queue").select("youtube_id,title,prepared_instagram_post,release_at,released_at,podcast_instagram_deliveries(status,slot_at,scheduled_at,published_at,permalink,error_code,publish_attempted_at)", {count:"exact"})
      .or("prepared_instagram_post.not.is.null,released_at.not.is.null")
      .order("released_at",{ascending:false,nullsFirst:true}).order("created_at",{ascending:false}).order("youtube_id")
      .range(offset,offset+PODCAST_HISTORY_PAGE_SIZE-1),
    db.from("podcast_distribution_settings").select("feed_enabled,instagram_enabled,scheduler_enabled").eq("singleton",true).single(),
    db.from("podcast_prepared_episodes").select("youtube_id,position").order("position").limit(PODCAST_QUEUE_DISPLAY_LIMIT),
    db.rpc("podcast_upcoming_windows"),
  ]);
  if (queue.error || settings.error || prepared.error || windows.error || !settings.data) throw new Error("podcast_instagram_drafts_read_failed");
  type Delivery = {status:string;slot_at:string;scheduled_at:string|null;published_at:string|null;permalink:string|null;error_code:string|null;publish_attempted_at:string|null};
  type PostRow = {youtube_id:string;title:string;prepared_instagram_post:{image_url?:string;caption?:string;reviewHold?:boolean}|null;release_at:string|null;released_at:string|null;podcast_instagram_deliveries:Delivery[]|Delivery|null};
  const predicted = new Map<string,string>();
  const slots: string[] = Array.isArray(windows.data) ? windows.data : [];
  if(settings.data.feed_enabled && settings.data.scheduler_enabled) for(const row of prepared.data ?? []) {
    const index=Number(row.position)-1;
    if(index>=0 && typeof slots[index]==="string") predicted.set(row.youtube_id,slots[index]);
  }
  const items: PodcastInstagramPost[] = ((queue.data ?? []) as unknown as PostRow[]).map(row=>{
    const delivery=Array.isArray(row.podcast_instagram_deliveries)?row.podcast_instagram_deliveries[0]??null:row.podcast_instagram_deliveries;
    const post=row.prepared_instagram_post, held=post?.reviewHold===true;
    const published=delivery?.status==="published";
    return {id:row.youtube_id,title:row.title,imageUrl:post?.image_url??null,caption:post?.caption??null,reviewHold:held,
      state:podcastInstagramPostState(delivery,held),scheduledAt:delivery?.scheduled_at??null,
      predictedAt:!published&&!held?(row.release_at??predicted.get(row.youtube_id)??null):null,
      publishedAt:published?delivery.published_at:null,permalink:published&&validInstagramPermalink(delivery.permalink)?delivery.permalink:null,
      errorCode:!published?(delivery?.publish_attempted_at?"request_unconfirmed":delivery?.error_code??(delivery?.status==="failed"?"request_failed":null)):null,
      recoverable:!held&&delivery?.status==="pending"&&!delivery.publish_attempted_at&&delivery.error_code!=="meta_create_uncertain"&&Date.parse(delivery.slot_at)<=Date.now()-5*60_000};
  });
  return {total:queue.count??0,items,feedEnabled:settings.data.feed_enabled,instagramEnabled:settings.data.instagram_enabled,schedulerEnabled:settings.data.scheduler_enabled};
}

export async function readPodcastInstagramDrafts(db: SupabaseClient, rawPage: unknown): Promise<PodcastInstagramDraftsSnapshot> {
  const offset = podcastHistoryPage(rawPage) * PODCAST_HISTORY_PAGE_SIZE;
  const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
  const { data, error, count } = await db.from("podcast_instagram_deliveries")
    .select("youtube_id,scheduled_at,podcast_episode_queue!inner(title,prepared_instagram_post)", { count: "exact" })
    .eq("status", "pending").is("publish_attempted_at", null)
    .or("error_code.is.null,error_code.neq.meta_create_uncertain").lte("slot_at", cutoff)
    .not("podcast_episode_queue.released_at", "is", null)
    .not("podcast_episode_queue.prepared_instagram_post", "is", null)
    .order("scheduled_at", { ascending: true, nullsFirst: false })
    .order("slot_at", { ascending: false }).order("youtube_id")
    .range(offset, offset + PODCAST_HISTORY_PAGE_SIZE - 1);
  if (error) throw new Error("podcast_instagram_drafts_read_failed");
  type DraftRow = { youtube_id: string; scheduled_at: string | null; podcast_episode_queue: { title: string; prepared_instagram_post?: { image_url?: string; caption?: string; reviewHold?: boolean } } };
  const items: PodcastInstagramDraft[] = ((data ?? []) as unknown as DraftRow[]).map((row) => ({
    id: row.youtube_id, title: row.podcast_episode_queue.title, scheduledAt: row.scheduled_at,
    imageUrl: row.podcast_episode_queue.prepared_instagram_post?.image_url ?? null,
    caption: row.podcast_episode_queue.prepared_instagram_post?.caption ?? null,
    reviewHold: row.podcast_episode_queue.prepared_instagram_post?.reviewHold === true,
  }));
  // Eligibility comes from the existing prepared view (active video, exact published article revision).
  // Read-only owner acceptance preview; never creates a delivery or calls preparation/Meta.
  const eligible = await db.from("podcast_prepared_episodes").select("youtube_id")
    .eq("youtube_id", PODCAST_INSTAGRAM_REVIEW_VIDEO).maybeSingle();
  if (eligible.error) throw new Error("podcast_instagram_drafts_read_failed");
  let futurePreview: PodcastInstagramDraft | null = null;
  {
    const future = await db.from("podcast_episode_queue").select("youtube_id,title,prepared_instagram_post")
      .eq("youtube_id", PODCAST_INSTAGRAM_REVIEW_VIDEO)
      .not("prepared_instagram_post", "is", null).maybeSingle();
    if (future.error) throw new Error("podcast_instagram_drafts_read_failed");
    const post = future.data?.prepared_instagram_post;
    if (future.data && post && typeof post === "object" && !Array.isArray(post) && (eligible.data || post.reviewHold === true) &&
      typeof post.image_url === "string" && typeof post.caption === "string" && post.caption.trim()) {
      futurePreview = { id: future.data.youtube_id, title: future.data.title,
        scheduledAt: null, imageUrl: post.image_url, caption: post.caption, reviewHold: post.reviewHold === true };
    }
  }
  return { total: count ?? 0, items, futurePreview };
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
