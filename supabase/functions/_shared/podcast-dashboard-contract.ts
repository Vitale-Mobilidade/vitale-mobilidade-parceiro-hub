export const PODCAST_HISTORY_PAGE_SIZE = 20;
export const PODCAST_QUEUE_DISPLAY_LIMIT = 40;
export const PODCAST_MAX_HISTORY_PAGE = 999;

export type PodcastDashboardItem = {
  id: string;
  title: string;
  articleSlug: string | null;
  slotAt: string | null;
  releasedAt: string | null;
  spotifyId: string | null;
  instagram?: { status: "pending" | "published" | "failed" | "expired" | "unconfirmed"; permalink: string | null };
};

export type PodcastDashboardSnapshot = {
  checkedAt: string;
  feedEnabled: boolean;
  schedulerEnabled: boolean;
  instagramEnabled?: boolean;
  audioCount: number;
  ready: { total: number; items: PodcastDashboardItem[] };
  prepared: { total: number; items: PodcastDashboardItem[] };
  released: { total: number; items: PodcastDashboardItem[] };
};

export function podcastHistoryPage(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? Math.min(value, PODCAST_MAX_HISTORY_PAGE) : 0;
}
