import { describe, expect, it } from "vitest";
import { articleMatchesSearch, comparedBikesInTitle, orderEditorialHighlights, relatedPublishedArticles } from "./editorial-discovery";
import type { PublishedArticleSummary } from "./editorial-repository.server";
import type { CatalogBike } from "./editorial-bikes";

const item = (id: string, primaryBikeId: string | null, relatedBikeIds: string[] = [], publishedAt = "2026-09-20"): PublishedArticleSummary => ({
  id, slug: id, title: id, summary: id, ogImageUrl: null, publishedAt, primaryBikeId, relatedBikeIds,
});
const bike = (bikeId: string, name: string): CatalogBike => ({ bikeId, name, slug: bikeId, link: null,
  sheetPrice: null, autonomy: null, capacity: null, description: null, image: null, category: null });

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

  it("encontra artigo por nome da Bike vinculada, com acentos e sem incluir outras bikes", () => {
    const article = item("comparativo", "v9_max", ["vl20"]);
    expect(articleMatchesSearch(article, "VL20", { v9_max: "V9 Max", vl20: "VL20 Ufofast" })).toBe(true);
    expect(articleMatchesSearch(article, "Ufofast", { v9_max: "V9 Max", vl20: "VL20 Ufofast" })).toBe(true);
    expect(articleMatchesSearch(article, "BW1", { v9_max: "V9 Max", vl20: "VL20 Ufofast" })).toBe(false);
  });

  it("compara os modelos do título, sem confundir a Bike contextual com um dos lados", () => {
    const connected = [bike("v9_max", "V9 Max"), bike("vl20", "VL20"), bike("v9_pro", "V9 Pro")];
    expect(comparedBikesInTitle("VL20 ou V9 Pro da Ufofast: o que muda no estilo V9 Max?", connected).map(b => b.bikeId)).toEqual(["vl20", "v9_pro"]);
    const variants = [bike("v9_max", "V9 Max"), bike("v9_max_s", "V9 Max S"), bike("v9_max_ufofast", "V9 Max Ufofast Duas Baterias")];
    expect(comparedBikesInTitle("V9 Max S ou V9 Max Ufofast: qual comprar?", variants).map(b => b.bikeId)).toEqual(["v9_max_s", "v9_max_ufofast"]);
  });
});
