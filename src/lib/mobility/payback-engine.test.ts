import { describe, expect, it } from "vitest";
import { computeBikePaybacks, computePaybackCost, paybackInsight } from "./payback-engine";
import { resolveBudget, validateNumber } from "./format";
import { LIMITS } from "./config";
import type { RecommendedBike } from "./recommendation-engine";

const bike = (id: string, price: number): RecommendedBike => ({
  bikeId: id, slug: id, name: id.toUpperCase(), image: null, price,
  link: "https://meli.la/abc", autonomyKm: 50, capacity: 1, monitored: false, reason: "",
} as unknown as RecommendedBike);

const base = { monthlySpend: 800, dailyKm: 20, daysPerWeek: 5, replaceablePercent: 100 };

describe("Payback rápido", () => {
  it("não soma custos fixos e calcula payback por bike", () => {
    const r = computePaybackCost(base);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.currentFixedRemoved).toBe(0);
    const [a] = computeBikePaybacks([bike("a", 6000)], r.data.currentTotalReplaced, r.data.bikeTotalCost);
    expect(a.projection.ok && a.projection.paybackMonths).toBeGreaterThan(0);
    expect(paybackInsight(r.data.monthlySavings, [a])).toContain("se paga");
  });

  it("0% zera economia e economia negativa não tem payback", () => {
    const zero = computePaybackCost({ ...base, replaceablePercent: 0 });
    expect(zero.ok && zero.data.monthlySavings).toBe(0);
    const neg = computePaybackCost({ ...base, monthlySpend: 10 });
    expect(neg.ok && neg.data.monthlySavings).toBeLessThan(0);
    if (!neg.ok) return;
    const [p] = computeBikePaybacks([bike("a", 6000)], neg.data.currentTotalReplaced, neg.data.bikeTotalCost);
    expect(p.projection.ok && p.projection.paybackMonths).toBeNull();
    expect(paybackInsight(neg.data.monthlySavings, [p])).toContain("Não existe prazo");
  });

  it("rejeita entradas inválidas", () => {
    expect(computePaybackCost({ ...base, dailyKm: -1 }).ok).toBe(false);
    expect(computePaybackCost({ ...base, monthlySpend: Number.NaN }).ok).toBe(false);
  });

  it("orçamento livre inválido não vira 'sem limite'", () => {
    expect(resolveBudget("none", "")).toBeNull();
    expect(resolveBudget("7000", "")).toBe(7000);
    expect(Number.isNaN(resolveBudget("custom", ""))).toBe(true);
    expect(validateNumber("0", "Orçamento", LIMITS.budget)).not.toBeNull();
  });
});
