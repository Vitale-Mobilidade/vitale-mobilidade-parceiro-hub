import { describe, expect, it } from "vitest";
import { recommendQuickComparison, type MobilityBikeCandidate } from "./recommendation-engine";

const link = "https://meli.la/x1";
const mk = (id: string, price: number, km: number, cap = 1, hill = false): MobilityBikeCandidate =>
  ({ bikeId: id, slug: id, name: id, image: null, price, link, autonomyKm: km, capacity: cap, monitored: false, hillTagged: hill });
// Cenário relatado: FT03 e V9 Max quase mesmo preço, diferença só em lugares.
const cat = [
  mk("ft03", 6111, 40, 1), mk("v9_max", 6161, 40, 2), mk("mid", 6800, 55, 2, true),
  mk("long_a", 8900, 70, 1), mk("long_b", 9400, 70, 2, true), mk("top", 14000, 100, 2),
];
const run = (maxBudget: number | null, extra: Partial<{ needsPassenger: boolean; needsHills: boolean }> = {}) => {
  const r = recommendQuickComparison(cat, { dailyKm: 20, needsPassenger: false, maxBudget, ...extra });
  if (!r.ok) throw new Error("erro");
  return r.bikes;
};

describe("alternativa só por autonomia relevante", () => {
  it("cenário Uber 20 km, teto 10k, sem garupa: +1 lugar não justifica; maior autonomia dentro do teto, empate pelo mais barato", () => {
    const b = run(10000);
    expect(b.map((x) => x.bikeId)).toEqual(["ft03", "long_a"]);
    expect(b[1].reason).not.toMatch(/lugar/);
    expect(b.every((x) => x.price <= 10000)).toBe(true);
  });
  it("teto 7k: nenhuma com ≥25% dentro do teto → só uma, com explicação", () => {
    const b = run(7000);
    expect(b.map((x) => x.bikeId)).toEqual(["ft03", "mid"]); // 55 ≥ 40×1,25 = 50
    const only = recommendQuickComparison([mk("ft03", 6111, 40), mk("v9_max", 6161, 45, 2)], { dailyKm: 20, needsPassenger: false, maxBudget: 7000 });
    expect(only.ok && only.bikes.length).toBe(1);
    expect(only.ok && only.bikes[0].reason).toMatch(/não mostramos segunda/);
  });
  it("teto 15k: maior autonomia dentro do teto", () => {
    expect(run(15000).map((x) => x.bikeId)).toEqual(["ft03", "top"]);
  });
  it("garupa: ambas com 2 lugares", () => {
    expect(run(10000, { needsPassenger: true }).map((x) => x.bikeId)).toEqual(["v9_max", "long_b"]);
  });
  it("subidas: ambas marcadas", () => {
    expect(run(10000, { needsHills: true }).map((x) => x.bikeId)).toEqual(["mid", "long_b"]);
  });
  it("sem orçamento: só a opção econômica provisória", () => {
    const b = run(null);
    expect(b.map((x) => x.bikeId)).toEqual(["ft03"]);
    expect(b[0].reason).toMatch(/provisória/);
  });
});
