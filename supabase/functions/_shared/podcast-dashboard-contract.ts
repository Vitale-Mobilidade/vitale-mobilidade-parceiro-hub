export const PODCAST_HISTORY_PAGE_SIZE = 20;
export const PODCAST_QUEUE_DISPLAY_LIMIT = 40;
export const PODCAST_MAX_HISTORY_PAGE = 999;
// Owner-selected acceptance preview only; this is not a worker hold or schedule rule.
export const PODCAST_INSTAGRAM_REVIEW_VIDEO = "hvtzaWLnM14";

export type PodcastInstagramDraftsSnapshot = {
  total: number;
  items: PodcastInstagramDraft[];
  futurePreview?: PodcastInstagramDraft | null;
};

export type PodcastInstagramDraft = {
  id: string;
  title: string;
  scheduledAt: string | null;
  imageUrl?: string | null;
  caption?: string | null;
  reviewHold?: boolean;
};

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
