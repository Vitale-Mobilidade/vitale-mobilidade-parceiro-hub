export type InstagramSingleState =
  "review" | "scheduled" | "publishing" | "published" | "attention";
export type InstagramSingleItem = {
  id: string;
  title: string;
  caption: string;
  state: InstagramSingleState;
  fingerprint: string;
  due_at: string | null;
  published_at: string | null;
  created_at: string;
  permalink: string | null;
  error_code: string | null;
  imageUrl: string | null;
};
export type InstagramSingleDashboard = {
  automationEnabled: boolean;
  pilotPending: boolean;
  firstApprovalPending: boolean;
  total: number;
  counts: Record<string, number>;
  issue: string | null;
  items: InstagramSingleItem[];
  source: {
    video_id: string;
    article_id: string;
    article_title: string;
  } | null;
};
