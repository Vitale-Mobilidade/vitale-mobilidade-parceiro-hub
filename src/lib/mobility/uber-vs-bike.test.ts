import { describe, expect, it } from "vitest";
import { computeQuickMobilityCost } from "./cost-engine";
import { computeUberVsBike, uberVsBikeInsight } from "./uber-vs-bike";

const base = { monthlySpend: 800, dailyKm: 10, daysPerWeek: 5, replaceablePercent: 50 };

describe("Uber vs bike", () => {
  it("reusa o modo rápido com modal uber e expõe gasto anual atual", () => {
    const r = computeUberVsBike(base);
    const ref = computeQuickMobilityCost({ modal: "uber", ...base });
    expect(r.ok && ref.ok).toBe(true);
    if (!r.ok || !ref.ok) return;
    expect(r.data).toEqual(ref.data);
    expect(r.annualCurrentSpend).toBe(9600);
    expect(r.data.currentTotalReplaced).toBe(400);
  });
  it("0% zera substituição e custo da bike", () => {
    const r = computeUberVsBike({ ...base, replaceablePercent: 0 });
    if (!r.ok) throw new Error();
    expect(r.data.monthlySavings).toBe(0);
    expect(r.data.bikeTotalCost).toBe(0);
    expect(uberVsBikeInsight({ replaceablePercent: 0, monthlySavings: 0, annualSavings: 0 })).toMatch(/0%/);
  });
  it("economia negativa é explícita", () => {
    const r = computeUberVsBike({ ...base, monthlySpend: 20 });
    if (!r.ok) throw new Error();
    expect(r.data.monthlySavings).toBeLessThan(0);
    expect(uberVsBikeInsight({ replaceablePercent: 50, monthlySavings: r.data.monthlySavings, annualSavings: 0 })).toMatch(/a mais/);
  });
  it("rejeita inválidos", () => {
    expect(computeUberVsBike({ ...base, monthlySpend: -1 }).ok).toBe(false);
    expect(computeUberVsBike({ ...base, replaceablePercent: 150 }).ok).toBe(false);
  });
});
