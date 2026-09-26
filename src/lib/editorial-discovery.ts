import type { PublishedArticle } from "@/components/editorial/ArticleView";
import type { PublishedArticleSummary } from "@/lib/editorial-repository.server";
import type { CatalogBike } from "@/lib/editorial-bikes";

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

export function articleMatchesSearch(article: Pick<PublishedArticleSummary, "title" | "summary" | "primaryBikeId" | "relatedBikeIds">, query: string, bikeNames: Record<string, string>): boolean {
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const terms = normalized(query).split(" ").filter(Boolean);
  if (!terms.length) return true;
  const searchable = normalized([article.title, article.summary, ...[article.primaryBikeId, ...article.relatedBikeIds]
    .filter((id): id is string => Boolean(id)).map(id => bikeNames[id] ?? "")].join(" "));
  return terms.every(term => searchable.includes(term));
}

/** The article's primary Bike may be context, not one of the two models in its headline. */
export function comparedBikesInTitle(title: string, connected: CatalogBike[]): CatalogBike[] {
  const normalized = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const headline = ` ${normalized(title)} `;
  const matches = connected.flatMap(bike => {
    const full = normalized(bike.name);
    const short = full.replace(/ (duas|2) baterias$/, "");
    const names = [...new Set([full, short])].filter(name => name.length >= 3);
    const found = names.map(name => ({ bike, at: headline.indexOf(` ${name} `), length: name.length })).filter(hit => hit.at >= 0);
    return found.length ? [found.sort((a, b) => b.length - a.length)[0]] : [];
  }).sort((a, b) => a.at - b.at || b.length - a.length);
  const selected: typeof matches = [];
  for (const match of matches) {
    if (selected.some(previous => match.at < previous.at + previous.length + 1 && previous.at < match.at + match.length + 1)) continue;
    selected.push(match);
    if (selected.length === 2) break;
  }
  return selected.length === 2 ? selected.map(hit => hit.bike) : connected.slice(0, 2);
}
