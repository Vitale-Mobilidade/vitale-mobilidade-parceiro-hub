import { describe, expect, it } from "vitest";
import { orderEditorialHighlights, relatedPublishedArticles } from "./editorial-discovery";
import type { PublishedArticleSummary } from "./editorial-repository.server";

const item = (id: string, primaryBikeId: string | null, relatedBikeIds: string[] = [], publishedAt = "2026-09-20"): PublishedArticleSummary => ({
  id, slug: id, title: id, summary: id, ogImageUrl: null, publishedAt, primaryBikeId, relatedBikeIds,
});

describe("descoberta editorial pública", () => {
  it("destaca relações reais e usa recência como desempate, sem alegar popularidade", () => {
    const recent = item("recent", "v9_max", [], "2026-09-25");
    const connected = item("connected", "v9_max", ["v9_pro"], "2026-09-20");
    expect(orderEditorialHighlights([recent, connected]).map(a => a.id)).toEqual(["connected", "recent"]);
    expect([recent, connected].map(a => a.id)).toEqual(["recent", "connected"]);
  });

  it("mostra apenas publicados do índice com relação explícita ou Bike compartilhada", () => {
    const article = { id: "base", primaryBikeId: "v9_max", relatedBikeIds: ["v9_pro"], relatedArticleIds: ["explicit"] };
    const index = [item("base", "v9_max"), item("same-bike", "v9_pro"), item("explicit", null), item("unrelated", "bw1")];
    expect(relatedPublishedArticles(article, index).map(a => a.id)).toEqual(["same-bike", "explicit"]);
  });
});
