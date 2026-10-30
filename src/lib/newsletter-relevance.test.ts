import { expect, it } from "vitest";
import { selectNewsletterDrops } from "./newsletter-pauta";
import { curateNewsletter, selectFeaturedNewsletterBike } from "./newsletter-curation";
import { compareOfferClickRelevance, parseOfferClickRanks } from "../../supabase/functions/_shared/bike-relevance";

const now = new Date("2026-10-30T15:00:00Z");
const bike = (id: string, rank: number, currentPrice = 90) => ({
  id, name: id, offerClickRank30d: rank, currentPrice,
  daily: [
    { date: "2026-10-20", close: 100, verifiedRuns: 1, lastVerifiedAt: "2026-10-20T14:00:00Z" },
    { date: "2026-10-30", close: currentPrice, verifiedRuns: 1, lastVerifiedAt: "2026-10-30T14:00:00Z" },
  ],
});

it("Radar da newsletter prefere cliques a desconto, entre quedas verificadas", () => {
  const bikes = [bike("a1", 3, 50), bike("b1", 1, 99), bike("c1", 2, 70), bike("d1", 4, 60)];
  expect(selectNewsletterDrops(bikes, now).map((b) => b.id)).toEqual(["b1", "c1", "a1"]);
  expect(selectNewsletterDrops(bikes, now)[0].percent).toBe(1);
  expect(selectNewsletterDrops([bike("a1", 1, 100)], now)).toEqual([]);
});

it("rotação vence popularidade e inclui variantes da mesma família", () => {
  const bikes = [bike("v9_max", 1), bike("v8_ultra", 2), bike("ft03", 7), bike("s20_pro", 8), bike("gt2000", 9)];
  expect(selectNewsletterDrops(bikes, now, ["v9_pro", "v8_pro"]).map((b) => b.id)).toEqual(["ft03", "s20_pro", "gt2000"]);
  expect(selectFeaturedNewsletterBike(bikes, [], [], ["v9_pro", "v8_pro"])?.id).toBe("ft03");
});

it("quando todos os modelos já apareceram, escolhe os menos recentes", () => {
  const bikes = [bike("a1", 1), bike("b1", 2), bike("c1", 3), bike("d1", 4)];
  expect(selectNewsletterDrops(bikes, now, ["a1", "b1", "c1", "d1"]).map((b) => b.id)).toEqual(["d1", "c1", "b1"]);
});

it("não ocupa o Radar inteiro com variantes da mesma família quando há alternativas", () => {
  const result = selectNewsletterDrops([bike("v8_pro", 1), bike("v8_ultra", 2), bike("ft03", 7), bike("gt2000", 8)], now);
  expect(result.map((b) => b.id)).toEqual(["v8_pro", "ft03", "gt2000"]);
});

it("fontes inéditas relacionadas a bikes relevantes ganham prioridade sem romper diversidade", () => {
  const article = (slug: string, id: string, rank: number, date: string, contentType: string) => ({ slug, title: slug, primaryBikeId: id, offerClickRank30d: rank, publishedAt: date, contentType });
  const list = [
    article("Mais novo", "a1", 9, "2026-10-29", "product_review"),
    article("Mais procurado", "b1", 1, "2026-10-20", "product_review"),
    article("Guia útil", "c1", 3, "2026-10-25", "buying_guide"),
    article("Já enviado", "d1", 1, "2026-10-29", "real_world_test"),
  ];
  const picked = curateNewsletter(list, [], new Date("2026-10-01"), now, ["Já enviado"], []);
  expect(picked.articles.map((a) => a.slug)).toEqual(["Mais procurado", "Guia útil", "Mais novo"]);
  const rotated = curateNewsletter(list, [], new Date("2026-10-01"), now, ["Já enviado"], ["b1"]);
  expect(rotated.articles[0].slug).not.toBe("Mais procurado");
});

it("o comparador e o contrato de prioridades são os mesmos do Radar", () => {
  expect([bike("b1", 1), bike("a1", 1)].sort(compareOfferClickRelevance).map((b) => b.id)).toEqual(["a1", "b1"]);
  expect(parseOfferClickRanks([{ bike_id: "a1", relevance_rank: 0 }])).toBeNull();
  expect(parseOfferClickRanks([{ bike_id: "a1", relevance_rank: 1 }])?.get("a1")).toBe(1);
});
