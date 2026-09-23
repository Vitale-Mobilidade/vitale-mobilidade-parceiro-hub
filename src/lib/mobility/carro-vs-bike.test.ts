import { describe, expect, it } from "vitest";
import { computeQuickMobilityCost } from "./cost-engine";
import { carroVsBikeInsight, computeCarroVsBike } from "./carro-vs-bike";

const base = { monthlySpend: 600, dailyKm: 20, daysPerWeek: 5, replaceablePercent: 50 };

describe("Carro vs bike (modo rápido compartilhado)", () => {
  it("veículo mantido: só variável, ignora custo fixo", () => {
    const r = computeCarroVsBike({ ...base, keepsVehicle: true, fixedAvoidedMonthly: 400 });
    if (!r.ok) throw new Error(r.errors.join());
    expect(r.data.currentFixedRemoved).toBe(0);
    expect(r.data.currentTotalReplaced).toBe(300);
    expect(r.data.fixedExcludedBecauseVehicleKept).toBe(true);
  });
  it("não mantido sem valor digitado: nada de fixo inventado", () => {
    const r = computeCarroVsBike({ ...base, keepsVehicle: false });
    const kept = computeCarroVsBike({ ...base, keepsVehicle: true });
    if (!r.ok || !kept.ok) throw new Error();
    expect(r.data.monthlySavings).toBe(kept.data.monthlySavings);
  });
  it("não mantido com custo fixo informado: soma integral", () => {
    const r = computeCarroVsBike({ ...base, keepsVehicle: false, fixedAvoidedMonthly: 400.005 });
    if (!r.ok) throw new Error();
    expect(r.data.currentFixedRemoved).toBe(400.01);
    expect(r.data.currentTotalReplaced).toBe(700.01);
  });
  it("motor rejeita custo fixo com veículo mantido/indefinido e negativo", () => {
    expect(computeQuickMobilityCost({ modal: "carro", ...base, fixedAvoidedMonthly: 100 }).ok).toBe(false);
    expect(computeQuickMobilityCost({ modal: "carro", ...base, keepsVehicle: true, fixedAvoidedMonthly: 100 }).ok).toBe(false);
    expect(computeCarroVsBike({ ...base, keepsVehicle: false, fixedAvoidedMonthly: -1 }).ok).toBe(false);
  });
  it("0% e 100%", () => {
    const z = computeCarroVsBike({ ...base, replaceablePercent: 0, keepsVehicle: true });
    const f = computeCarroVsBike({ ...base, replaceablePercent: 100, keepsVehicle: true });
    if (!z.ok || !f.ok) throw new Error();
    expect(z.data.monthlySavings).toBe(0);
    expect(z.data.bikeTotalCost).toBe(0);
    expect(f.data.currentTotalReplaced).toBe(600);
  });
  it("economia negativa é honesta", () => {
    const r = computeCarroVsBike({ ...base, monthlySpend: 10, keepsVehicle: true });
    if (!r.ok) throw new Error();
    expect(r.data.monthlySavings).toBeLessThan(0);
    expect(carroVsBikeInsight({ replaceablePercent: 50, monthlySavings: r.data.monthlySavings, annualSavings: r.data.annualSavings, keepsVehicle: true, fixedIncluded: 0 })).toMatch(/Não há retorno/);
  });
  it("insight positivo fala em economia líquida estimada e nunca garantida", () => {
    const t = carroVsBikeInsight({ replaceablePercent: 50, monthlySavings: 200, annualSavings: 2400, keepsVehicle: true, fixedIncluded: 0 });
    expect(t).toMatch(/Economia líquida estimada/);
    expect(t).not.toMatch(/garantid/);
  });
});
