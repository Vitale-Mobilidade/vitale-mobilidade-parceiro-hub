import { describe, expect, it } from "vitest";
import { BIKES, type Bike } from "@/data/bikes";
import { recommend, type Answers } from "./quiz-engine";
import { countBikeVideos } from "./quiz-video-counts";
import { mergeCatalog } from "./bike-catalog";
import type { VideoItem } from "./video-catalog";
const answers: Answers = {
  main_use: "locomocao_diaria",
  daily_km_range: "10_25_km",
  route_type: "plano",
  rider_capacity_need: "apenas_1_pessoa",
  weight_range: "ate_80kg",
  budget_range: "ate_7000",
  had_ebike_before: "nao",
};
const bike = (id: string, overrides: Partial<Bike> = {}): Bike => ({
  ...BIKES[0],
  id,
  fullDescription: "Uso urbano em asfalto.",
  autonomyKm: 50,
  internalPrice: 6000,
  videoCount: 0,
  ...overrides,
});
describe("quiz scoring from descriptions and editorial proximity", () => {
  it("uses the same rules for old and new model IDs", () => {
    const r = recommend(answers, null, [
      bike("ft03"),
      bike("new_model", { isDynamic: true }),
    ]);
    expect(r.baseScores.ft03).toBe(r.baseScores.new_model);
  });
  it("updated sheet description changes use suitability", () => {
    const r = recommend(
      { ...answers, main_use: "trabalho_delivery_renda" },
      null,
      [
        bike("a"),
        bike("b", {
          fullDescription: "Ideal para trabalho e entregas em uso urbano.",
        }),
      ],
    );
    expect(r.primary.id).toBe("b");
    expect(r.baseScores.b - r.baseScores.a).toBe(30);
  });
  it("negative claims and comparisons do not earn terrain points", () => {
    const r = recommend({ ...answers, route_type: "muitas_subidas" }, null, [
      bike("a", {
        fullDescription:
          "Não indicada para subidas. Diferente da V8 Pro em subidas.",
      }),
      bike("b", { fullDescription: "Bom desempenho em subidas." }),
    ]);
    expect(r.baseScores.b - r.baseScores.a).toBe(35);
  });
  it("more videos wins at five points and leaves original scores intact", () => {
    const r = recommend(answers, null, [
      bike("a", {
        fullDescription: "Uso urbano em asfalto. Ideal para primeira bike.",
      }),
      bike("b", { videoCount: 8 }),
    ]);
    expect(r.primary.id).toBe("b");
    expect(r.secondary?.id).toBe("a");
    expect(r.baseScores.a - r.baseScores.b).toBe(5);
    expect(r.primaryScore).toBe(r.baseScores.b);
    expect(r.sourceInterestInfluencedRanking).toBe(false);
  });
  it("coverage cannot cross a larger score gap or budget ceiling", () => {
    const r = recommend(answers, null, [
      bike("a"),
      bike("b", { autonomyKm: 30, videoCount: 999 }),
      bike("c", { internalPrice: 9000, videoCount: 1000 }),
    ]);
    expect(r.primary.id).toBe("a");
    expect(r.finalScores.c).toBeUndefined();
  });
  it("proximity groups are anchored, deterministic and do not chain", () => {
    const list = [
      bike("a", {
        fullDescription: "Uso urbano em asfalto. Ideal para primeira bike.",
      }),
      bike("b", { videoCount: 2 }),
      bike("c", {
        fullDescription:
          "Uso urbano em asfalto. Indicada para usuários experientes.",
        videoCount: 100,
      }),
    ];
    expect(recommend(answers, null, list).primary.id).toBe("b");
    expect(recommend(answers, null, [...list].reverse()).secondary?.id).toBe(
      "a",
    );
  });
  it("distinct video IDs count once for each exact model association", () => {
    const videos = [
      { videoId: "one", bikeIds: ["a", "b", "a"] },
      { videoId: "one", bikeIds: ["a"] },
      { videoId: "two", bikeIds: ["a"] },
    ] as VideoItem[];
    expect(countBikeVideos(videos)).toEqual({ a: 2, b: 1 });
  });
  it("merge propagates video counts to existing and new bikes", () => {
    const snapshot = {
      id: BIKES[0].id,
      name: "test",
      description: "Uso urbano",
      price: 6000,
      autonomyKm: 50,
      capacity: 1,
      linkVitale: "https://meli.la/Test9",
      videoCount: 4,
    };
    expect(mergeCatalog(BIKES, [snapshot])[0].videoCount).toBe(4);
  });
  it("load explicitly declared in description overrides stale metadata", () => {
    const r = recommend({ ...answers, weight_range: "100_120kg" }, null, [
      bike("a", { weightSupportKg: 120 }),
      bike("b", {
        weightSupportKg: 120,
        fullDescription:
          "Uso urbano em asfalto. Capacidade máxima informada: até 150 kg. Peso informado: 42 kg.",
      }),
    ]);
    expect(r.baseScores.b - r.baseScores.a).toBe(10);
  });
});
