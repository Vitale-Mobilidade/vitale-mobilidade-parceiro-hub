import { describe, expect, it } from "vitest";
import {
  recommendBikes,
  recommendQuickComparison,
  recommendScenarioPair,
  type MobilityBikeCandidate,
  type RecommendedBike,
} from "./recommendation-engine";

const base: MobilityBikeCandidate = {
  bikeId: "a1",
  slug: "a1",
  name: "A1",
  image: null,
  price: 8000,
  link: "https://meli.la/ABC123",
  autonomyKm: 60,
  capacity: 2,
  monitored: true,
};
const make = (over: Partial<MobilityBikeCandidate>): MobilityBikeCandidate => ({ ...base, ...over });

const criteria = { dailyKm: 20, needsPassenger: false, maxBudget: null };

/** Helper: falha explicitamente quando o motor recusou a entrada. */
function bikesOf(result: ReturnType<typeof recommendBikes>): RecommendedBike[] {
  expect(result.ok).toBe(true);
  return result.ok ? result.bikes : [];
}

describe("BikeRecommendationEngine", () => {
  it("sem candidatas devolve lista vazia", () => {
    expect(bikesOf(recommendBikes([], criteria))).toEqual([]);
  });

  it("descarta link fora do padrão meli.la e preço inválido", () => {
    const out = bikesOf(
      recommendBikes(
        [
          make({ bikeId: "bad_link", link: "https://mercadolivre.com.br/x" }),
          make({ bikeId: "bad_price", price: 0 }),
          make({ bikeId: "ok" }),
        ],
        criteria,
      ),
    );
    expect(out.map((b) => b.bikeId)).toEqual(["ok"]);
    expect(out[0].link).toBe("https://meli.la/ABC123");
  });

  it("exige autonomia >= km diário com margem de 20% e não aceita autonomia ausente", () => {
    const out = bikesOf(
      recommendBikes(
        [
          make({ bikeId: "curta", autonomyKm: 20 }),
          make({ bikeId: "sem_dado", autonomyKm: null }),
          make({ bikeId: "suficiente", autonomyKm: 24 }),
        ],
        { dailyKm: 20, needsPassenger: false, maxBudget: null },
      ),
    );
    expect(out.map((b) => b.bikeId)).toEqual(["suficiente"]);
  });

  it("filtra por capacidade 2 quando há garupa e por orçamento máximo", () => {
    const list = [make({ bikeId: "solo", capacity: 1 }), make({ bikeId: "dupla", capacity: 2, price: 9000 })];
    expect(
      bikesOf(recommendBikes(list, { dailyKm: 20, needsPassenger: true, maxBudget: null })).map((b) => b.bikeId),
    ).toEqual(["dupla"]);
    expect(bikesOf(recommendBikes(list, { dailyKm: 20, needsPassenger: true, maxBudget: 8500 }))).toEqual([]);
  });

  it("recusa orçamento inválido em vez de tratar como 'sem limite'", () => {
    const list = [make({ bikeId: "ok", price: 8000 })];
    for (const bad of [0, -100, Number.NaN, 0.5, 500000]) {
      const r = recommendBikes(list, { dailyKm: 20, needsPassenger: false, maxBudget: bad });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.errors.join(" ")).toContain("Orçamento máximo");
    }
    // Em branco (null) continua significando "não filtrar por preço".
    expect(bikesOf(recommendBikes(list, { dailyKm: 20, needsPassenger: false, maxBudget: null }))).toHaveLength(1);
  });

  it("recusa distância diária inválida sem devolver recomendação", () => {
    const r = recommendBikes([make({})], { dailyKm: 0, needsPassenger: false, maxBudget: null });
    expect(r.ok).toBe(false);
  });

  it("ordena por preço, depois autonomia, depois id, e limita a 3", () => {
    const out = bikesOf(
      recommendBikes(
        [
          make({ bikeId: "d", price: 9000 }),
          make({ bikeId: "b", price: 7000, autonomyKm: 50 }),
          make({ bikeId: "a", price: 7000, autonomyKm: 80 }),
          make({ bikeId: "c", price: 8000 }),
        ],
        criteria,
      ),
    );
    expect(out.map((b) => b.bikeId)).toEqual(["a", "b", "c"]);
    expect(out[0].reason).toContain("80 km");
  });
});

describe("BikeRecommendationEngine — comparação rápida", () => {
  it("com teto: alternativa = maior autonomia relevante dentro do teto (sem teto: só a econômica)", () => {
    const r = recommendQuickComparison(
      [
        make({ bikeId: "barata", price: 5000, autonomyKm: 40, capacity: 1 }),
        make({ bikeId: "intermediaria", price: 6000, autonomyKm: 55, capacity: 2 }),
        make({ bikeId: "longa", price: 9000, autonomyKm: 90, capacity: 1 }),
      ],
      { ...criteria, maxBudget: 10000 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bikes.map((bike) => bike.bikeId)).toEqual(["barata", "longa"]);
    expect(r.bikes[1].tradeoff).toEqual({ extraPrice: 4000, extraAutonomyKm: 50, extraCapacity: 0 });
    expect(r.eligibleCount).toBe(3);
  });

  it("retorna somente as bikes reais disponíveis e respeita orçamento e garupa", () => {
    const r = recommendQuickComparison(
      [
        make({ bikeId: "solo", price: 5000, capacity: 1 }),
        make({ bikeId: "garupa", price: 7000, capacity: 2 }),
        make({ bikeId: "cara", price: 12000, capacity: 2 }),
      ],
      { dailyKm: 20, needsPassenger: true, maxBudget: 8000 },
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bikes.map((bike) => bike.bikeId)).toEqual(["garupa"]);
    expect(recommendQuickComparison([], criteria)).toEqual({ ok: true, bikes: [], eligibleCount: 0 });
  });

  it("sem vantagem relevante mostra só uma; mais cara sem ganho não entra", () => {
    const r = recommendQuickComparison(
      [
        make({ bikeId: "a", price: 5000, autonomyKm: 60, capacity: 1 }),
        make({ bikeId: "b", price: 8000, autonomyKm: 70, capacity: 1 }),
      ],
      criteria,
    );
    if (!r.ok) throw new Error();
    expect(r.bikes.map((b) => b.bikeId)).toEqual(["a"]);
    expect(r.bikes[0].role).toBe("economica");
  });

  it("orçamento: folga até o teto e nunca acima dele", () => {
    const r = recommendQuickComparison(
      [
        make({ bikeId: "a", price: 5000, autonomyKm: 40, capacity: 1 }),
        make({ bikeId: "b", price: 6500, autonomyKm: 80, capacity: 1 }),
        make({ bikeId: "c", price: 9000, autonomyKm: 120, capacity: 2 }),
      ],
      { dailyKm: 20, needsPassenger: false, maxBudget: 7000 },
    );
    if (!r.ok) throw new Error();
    expect(r.bikes.map((b) => [b.bikeId, b.budgetRemaining])).toEqual([
      ["a", 2000],
      ["b", 500],
    ]);
    expect(r.bikes[1].reason).toMatch(/R\$ 1\.500 a mais por \+40 km/);
  });

  it("sem orçamento: budgetRemaining null", () => {
    const r = recommendQuickComparison([make({ bikeId: "a", price: 5000, autonomyKm: 40 })], criteria);
    if (!r.ok) throw new Error();
    expect(r.bikes[0].budgetRemaining).toBeNull();
  });
});

describe("BikeRecommendationEngine — par contextual das ferramentas", () => {
  it("mostra segunda opção sem exigir teto, somente com ganho verificável de autonomia", () => {
    const r = recommendScenarioPair(
      [
        make({ bikeId: "economica", price: 5000, autonomyKm: 40 }),
        make({ bikeId: "sem_ganho", price: 5200, autonomyKm: 45 }),
        make({ bikeId: "alternativa", price: 6500, autonomyKm: 70 }),
        make({ bikeId: "link_invalido", price: 6000, autonomyKm: 100, link: "https://example.com" }),
      ],
      criteria,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.bikes.map((bike) => bike.bikeId)).toEqual(["economica", "alternativa"]);
    expect(r.bikes[1].tradeoff?.extraPrice).toBe(1500);
  });
});
