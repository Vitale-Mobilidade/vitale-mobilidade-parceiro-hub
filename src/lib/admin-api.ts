import { supabase } from "@/integrations/supabase/client";
import type { EditorialArticle, EditorialVideo } from "../../supabase/functions/_shared/editorial-contract";

export type AdminRole = "admin" | "content" | "operation";
export type AdminSession = { role: AdminRole; email: string | null };
export type AdminOverview = {
  bikes: number;
  videos: number;
  videosWithTranscript?: number;
  videosWithArticle?: number;
  articles: Record<string, number>;
  generationErrors: number;
  sync: { last_success_at?: string | null; last_attempt_at?: string | null; status?: string | null; error_message?: string | null } | null;
};
export type AdminGrowth = {
  rangeDays: number;
  generatedAt: string;
  quiz: {
    started: number;
    completed: number;
    purchaseClicks: number;
    identifiedClickers: number;
  };
  topBikes: { name: string; clicks: number }[];
  origins: { name: string; leads: number }[];
  recentClickers: {
    id: string;
    name: string | null;
    phone: string | null;
    bike: string | null;
    position: string | null;
    clickedAt: string;
  }[];
  coverage: {
    pageViews: "external_analytics_not_connected";
    sitewideAffiliateClicks: "gtm_only";
    identifiedClicks: "quiz_supabase";
  };
};
export type AdminBike = {
  bike_id: string; slug: string; name: string; autonomy_km: number | null;
  image_url: string | null; motor_w: number | null; battery: string | null; capacity_people: number | null;
};
export type AdminOffer = {
  bike_id: string; price: number; url: string; verified_at: string | null;
  synced_at: string | null; is_current: boolean; ended_at: string | null; end_reason: string | null;
};
export type ArticleRow = Pick<EditorialArticle, "id" | "title" | "slug" | "status" | "content_type" | "video_id" | "primary_bike_id" | "updated_at" | "published_at" | "validation_errors">;

export class AdminApiError extends Error {
  constructor(message: string, public readonly status: number) { super(message); }
}

/** Every privileged request carries the current Supabase Auth JWT; no service key reaches the browser. */
export async function adminCall<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new AdminApiError("Sessão expirada. Entre novamente.", 401);
  const base = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const response = await fetch(`${base}/functions/v1/editorial-admin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  let data: Record<string, unknown> = {};
  try { data = await response.json(); } catch { /* generic error below */ }
  if (!response.ok) throw new AdminApiError(typeof data.error === "string" ? data.error : "Falha no admin.", response.status);
  return data as T;
}

export type AdminVideoList = { videos: EditorialVideo[] };
export type AdminArticleList = { articles: ArticleRow[] };
export type AdminEditorialWorkspace = AdminVideoList & AdminArticleList;

/** Streams NDJSON progress events from a long-running admin action (article generation). */
export async function adminStream<T>(action: string, payload: Record<string, unknown>, onProgress: (step: string) => void): Promise<T> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token;
  if (!token) throw new AdminApiError("Sessão expirada. Entre novamente.", 401);
  const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/editorial-admin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok || !response.body) {
    let message = "Não conseguimos gerar o artigo. Tente novamente.";
    try { const data = await response.json(); if (typeof data.error === "string") message = data.error; } catch { /* keep default */ }
    throw new AdminApiError(message, response.status);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (value) buffer += decoder.decode(value, { stream: true });
    let cut: number;
    while ((cut = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, cut).trim(); buffer = buffer.slice(cut + 1);
      if (!line) continue;
      const event = JSON.parse(line) as { type: string; step?: string; message?: string } & T;
      if (event.type === "progress" && event.step) onProgress(event.step);
      if (event.type === "error") throw new AdminApiError(event.message ?? "Não conseguimos gerar o artigo. Tente novamente.", 422);
      if (event.type === "done") return event as T;
    }
    if (done) break;
  }
  throw new AdminApiError("Não conseguimos gerar o artigo. Tente novamente.", 500);
}
