import { describe, expect, it } from "vitest";
import { BIKES, BUDGET_MAX_PRICE } from "@/data/bikes";
import { recommend, type Answers } from "@/lib/quiz-engine";
import { mergeCatalog } from "@/lib/bike-catalog";
import { buildTrackerEntries, isSafePurchaseLink } from "@/lib/price-tracker";

const answers: Answers = {
  main_use: "trabalho",
  daily_km_range: "10_20",
  route_type: "plano",
  rider_capacity_need: "so_eu",
  weight_range: "ate_80",
  budget_range: "ate_7000",
  had_ebike_before: "nao",
};

const AFFILIATE = "https://meli.la/TesteFixture9"; // fixture, nunca acessado

describe("Quiz — regras puras", () => {
  it("filtro de orçamento é rígido quando há opções no limite", () => {
    const r = recommend(answers, null, BIKES);
    expect(r.primary.internalPrice).toBeLessThanOrEqual(BUDGET_MAX_PRICE.ate_7000);
    if (r.secondary) expect(r.secondary.internalPrice).toBeLessThanOrEqual(BUDGET_MAX_PRICE.ate_7000);
    expect(r.secondary?.id).not.toBe(r.primary.id);
  });

  it("é determinístico para as mesmas respostas", () => {
    expect(recommend(answers, null, BIKES).primary.id).toBe(recommend(answers, null, BIKES).primary.id);
  });
});

describe("href afiliado direto — preservação exata", () => {
  const base = BIKES[0];
  const merged = mergeCatalog(BIKES, [
    {
      id: base.id,
      name: base.name,
      description: "Descrição de teste",
      price: 5000,
      autonomyKm: base.autonomyKm,
      capacity: base.capacity,
      linkVitale: AFFILIATE,
      status: "eligible",
    },
  ]);
  const bike = merged.find((b) => b.id === base.id)!;

  it("usa o Link Vitale sem reescrever parâmetros", () => {
    expect(bike.affiliateLink).toBe(AFFILIATE);
    expect(bike.linkVitale).toBe(AFFILIATE);
    expect(bike.linkMeta).toBe(base.linkMeta);
  });

  it("link fora do padrão meli.la é ignorado e o anterior é mantido", () => {
    const kept = mergeCatalog(BIKES, [{ id: base.id, description: "x", price: 5000, autonomyKm: 30, capacity: 1, linkVitale: "https://evil.example/x", status: "eligible" }]);
    expect(kept.find((b) => b.id === base.id)!.affiliateLink).toBe(base.affiliateLink);
  });

  it("recomendação devolve o mesmo href", () => {
    const r = recommend({ ...answers, budget_range: "acima_10000" }, null, merged);
    const all = [r.primary, r.secondary].filter(Boolean);
    for (const b of all) expect(b!.affiliateLink).toBe(merged.find((m) => m.id === b!.id)!.affiliateLink);
  });

  it("Radar só aceita https e mantém o link intacto", () => {
    expect(isSafePurchaseLink(AFFILIATE)).toBe(true);
    expect(isSafePurchaseLink("http://mercadolivre.com/x")).toBe(false);
    expect(isSafePurchaseLink("javascript:alert(1)")).toBe(false);
    const now = new Date("2026-09-01T12:00:00Z");
    const entries = buildTrackerEntries(
      [
        { id: "a", name: "A", currentPrice: 5000, link: AFFILIATE, points: [] } as never,
        { id: "b", name: "B", currentPrice: 5000, link: "http://x.com", points: [] } as never,
      ],
      30,
      now,
    );
    expect(entries.map((e) => e.link)).toEqual([AFFILIATE]);
  });
});
