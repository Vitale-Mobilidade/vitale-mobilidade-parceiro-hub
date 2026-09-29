// Server-only, read-only RPCs. Drafts, transcripts and service-role keys never reach public loaders.
import type { PublishedArticle } from "@/components/editorial/ArticleView";
import { BIKE_ID_RE } from "@/lib/bike-identity";

export type PublishedArticleSummary = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  ogImageUrl: string | null;
  contentType?: string;
  publishedAt: string | null;
  primaryBikeId: string | null;
  relatedBikeIds: string[];
};
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNAVAILABLE = Symbol("editorial_unavailable");

async function rpc(
  name: string,
  body: Record<string, unknown>,
): Promise<unknown | null> {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ??
    process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return UNAVAILABLE;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
    return response.ok ? await response.json() : UNAVAILABLE;
  } catch (e) {
    console.error("[editorial-rpc]", e);
    return UNAVAILABLE;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchPublishedArticle(
  slug: string,
): Promise<PublishedArticle | null> {
  const result = await fetchPublishedArticleResult(slug);
  return result.ok ? result.article : null;
}

export type ArticleReadResult =
  { ok: false } | { ok: true; article: PublishedArticle | null };
export async function fetchPublishedArticleResult(
  slug: string,
): Promise<ArticleReadResult> {
  if (!SLUG.test(slug) || slug.length > 120) return { ok: true, article: null };
  const row = await rpc("get_published_editorial_article", { p_slug: slug });
  if (row === null) return { ok: true, article: null };
  if (!row || typeof row !== "object" || Array.isArray(row))
    return { ok: false };
  const a = row as Partial<PublishedArticle>;
  if (
    a.slug !== slug ||
    typeof a.title !== "string" ||
    !Array.isArray(a.blocks) ||
    typeof a.videoId !== "string"
  )
    return { ok: false };
  return {
    ok: true,
    article: {
      ...a,
      blocks: a.blocks.map(
        ({ sourceExcerpt: _privateEvidence, ...block }) => block,
      ),
      faq: Array.isArray(a.faq)
        ? a.faq.map(({ sourceExcerpt: _privateEvidence, ...item }) => ({
            ...item,
            sourceExcerpt: "",
          }))
        : [],
      relatedBikeIds: a.relatedBikeIds ?? [],
      relatedArticleIds: a.relatedArticleIds ?? [],
    } as PublishedArticle,
  };
}

export async function fetchPublishedIndex(): Promise<
  PublishedArticleSummary[] | null
> {
  const rows = await rpc("get_published_editorial_index", {});
  if (!Array.isArray(rows)) return null;
  return rows
    .filter(
      (r) =>
        r &&
        typeof r === "object" &&
        typeof r.slug === "string" &&
        SLUG.test(r.slug) &&
        typeof r.title === "string",
    )
    .map((r) => {
      const article = r as Omit<PublishedArticleSummary, "relatedBikeIds"> & {
        relatedBikeIds?: unknown;
      };
      return {
        ...article,
        relatedBikeIds: Array.isArray(article.relatedBikeIds)
          ? article.relatedBikeIds.filter(
              (bikeId): bikeId is string => typeof bikeId === "string",
            )
          : [],
      };
    });
}

export async function fetchPublishedArticlesForBike(
  bikeId: string,
): Promise<PublishedArticleSummary[] | null> {
  if (!BIKE_ID_RE.test(bikeId)) return [];
  const articles = await fetchPublishedIndex();
  if (!articles) return null;
  return articles.filter(
    (article) =>
      article.primaryBikeId === bikeId ||
      article.relatedBikeIds.includes(bikeId),
  );
}
