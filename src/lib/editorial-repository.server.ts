// Server-only, read-only RPCs. Drafts, transcripts and service-role keys never reach public loaders.
import type { PublishedArticle } from "@/components/editorial/ArticleView";

export type PublishedArticleSummary = {
  id: string; slug: string; title: string; summary: string; ogImageUrl: string | null;
  publishedAt: string | null; primaryBikeId: string | null;
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function rpc(name: string, body: Record<string, unknown>): Promise<unknown | null> {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST", signal: controller.signal,
      headers: { apikey: key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
    });
    return response.ok ? await response.json() : null;
  } catch (e) { console.error("[editorial-rpc]", e); return null; }
  finally { clearTimeout(timer); }
}

export async function fetchPublishedArticle(slug: string): Promise<PublishedArticle | null> {
  if (!SLUG.test(slug) || slug.length > 120) return null;
  const row = await rpc("get_published_editorial_article", { p_slug: slug });
  if (!row || typeof row !== "object" || Array.isArray(row)) return null;
  const a = row as Partial<PublishedArticle>;
  if (a.slug !== slug || typeof a.title !== "string" || !Array.isArray(a.blocks) || typeof a.videoId !== "string") return null;
  return { ...a, faq: Array.isArray(a.faq) ? a.faq : [], relatedBikeIds: a.relatedBikeIds ?? [],
    relatedArticleIds: a.relatedArticleIds ?? [] } as PublishedArticle;
}

export async function fetchPublishedIndex(): Promise<PublishedArticleSummary[] | null> {
  const rows = await rpc("get_published_editorial_index", {});
  if (!Array.isArray(rows)) return null;
  return rows.filter((r) => r && typeof r.slug === "string" && SLUG.test(r.slug) && typeof r.title === "string") as PublishedArticleSummary[];
}
