import type { PublishedArticle } from "@/components/editorial/ArticleView";
import type { PublishedArticleSummary } from "@/lib/editorial-repository.server";

// Editorial relevance from published metadata only; this is not a popularity ranking.
export function orderEditorialHighlights<T extends Pick<PublishedArticleSummary, "publishedAt" | "primaryBikeId" | "relatedBikeIds">>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const connections = (item: T) => Number(Boolean(item.primaryBikeId)) + item.relatedBikeIds.length;
    return connections(b) - connections(a) || (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "");
  });
}

export function relatedPublishedArticles<T extends PublishedArticleSummary>(article: Pick<PublishedArticle, "id" | "primaryBikeId" | "relatedBikeIds" | "relatedArticleIds">, index: T[]): T[] {
  const bikeIds = new Set([article.primaryBikeId, ...article.relatedBikeIds].filter(Boolean));
  return index.filter(candidate => candidate.id !== article.id && (
    article.relatedArticleIds.includes(candidate.id) ||
    [candidate.primaryBikeId, ...candidate.relatedBikeIds].some(id => id && bikeIds.has(id))
  ));
}
