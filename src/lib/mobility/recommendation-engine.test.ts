import { describe, expect, it } from "vitest";
import { recommendBikes, type MobilityBikeCandidate } from "./recommendation-engine";

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

describe("BikeRecommendationEngine", () => {
  it("sem candidatas devolve lista vazia", () => {
    expect(recommendBikes([], criteria)).toEqual([]);
  });

  it("descarta link fora do padrão meli.la e preço inválido", () => {
    const out = recommendBikes(
      [
        make({ bikeId: "bad_link", link: "https://mercadolivre.com.br/x" }),
        make({ bikeId: "bad_price", price: 0 }),
        make({ bikeId: "ok" }),
      ],
      criteria,
    );
    expect(out.map((b) => b.bikeId)).toEqual(["ok"]);
    expect(out[0].link).toBe("https://meli.la/ABC123");
  });

  it("exige autonomia >= km diário com margem de 20% e não aceita autonomia ausente", () => {
    const out = recommendBikes(
      [
        make({ bikeId: "curta", autonomyKm: 20 }),
        make({ bikeId: "sem_dado", autonomyKm: null }),
        make({ bikeId: "suficiente", autonomyKm: 24 }),
      ],
      { dailyKm: 20, needsPassenger: false, maxBudget: null },
    );
    expect(out.map((b) => b.bikeId)).toEqual(["suficiente"]);
  });

  it("filtra por capacidade 2 quando há garupa e por orçamento máximo", () => {
    const list = [
      make({ bikeId: "solo", capacity: 1 }),
      make({ bikeId: "dupla", capacity: 2, price: 9000 }),
    ];
    expect(recommendBikes(list, { dailyKm: 20, needsPassenger: true, maxBudget: null }).map((b) => b.bikeId)).toEqual([
      "dupla",
    ]);
    expect(recommendBikes(list, { dailyKm: 20, needsPassenger: true, maxBudget: 8500 })).toEqual([]);
  });

  it("ordena por preço, depois autonomia, depois id, e limita a 3", () => {
    const out = recommendBikes(
      [
        make({ bikeId: "d", price: 9000 }),
        make({ bikeId: "b", price: 7000, autonomyKm: 50 }),
        make({ bikeId: "a", price: 7000, autonomyKm: 80 }),
        make({ bikeId: "c", price: 8000 }),
      ],
      criteria,
    );
    expect(out.map((b) => b.bikeId)).toEqual(["a", "b", "c"]);
    expect(out[0].reason).toContain("80 km");
  });
});
