import { describe, expect, it } from "vitest";
import { recommendQuickComparison, type MobilityBikeCandidate } from "./recommendation-engine";
import { hasHillTag } from "../mobility-bikes.functions";

const link = "https://meli.la/abc123";
const mk = (id: string, price: number, km: number, hill?: boolean): MobilityBikeCandidate => ({
  bikeId: id, slug: id, name: id, image: null, price, link, autonomyKm: km, capacity: 1, monitored: false, hillTagged: hill,
});
const cands = [mk("a", 3000, 40), mk("b", 4000, 40, true), mk("c", 5000, 80, true), mk("d", 2500, 60, undefined)];

describe("filtro de subidas", () => {
  it("desmarcado mantém o filtro atual", () => {
    const r = recommendQuickComparison(cands, { dailyKm: 10, needsPassenger: false, maxBudget: null });
    expect(r.ok && r.bikes.map((b) => b.bikeId)).toEqual(["d", "c"]);
  });
  it("marcado só aceita evidência positiva; desconhecido não entra", () => {
    const r = recommendQuickComparison(cands, { dailyKm: 10, needsPassenger: false, maxBudget: null, needsHills: true });
    expect(r.ok && r.bikes.map((b) => b.bikeId)).toEqual(["b", "c"]);
    expect(r.ok && r.bikes[0].reason).toContain("indicada para trajetos com subidas");
  });
  it("pode resultar em zero com orçamento rígido", () => {
    const r = recommendQuickComparison(cands, { dailyKm: 10, needsPassenger: false, maxBudget: 3500, needsHills: true });
    expect(r.ok && r.bikes).toEqual([]);
  });
  it("hasHillTag valida arrays de strings e valores exatos", () => {
    expect(hasHillTag({ terrains: ["misto", "muitas_subidas"] })).toBe(true);
    expect(hasHillTag({ bestFor: ["subidas"] })).toBe(true);
    expect(hasHillTag({ terrains: "muitas_subidas" })).toBe(false);
    expect(hasHillTag({ bestFor: ["subidas", 3] })).toBe(false);
    expect(hasHillTag({ bestFor: ["subidas_fortes"], terrains: null })).toBe(false);
    expect(hasHillTag({})).toBe(false);
  });
});
