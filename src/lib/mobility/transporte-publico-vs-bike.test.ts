import { describe, expect, it } from "vitest";
import { computeQuickMobilityCost } from "./cost-engine";
import { computeCarroVsBike } from "./carro-vs-bike";
import { computeTransportePublicoVsBike, dominantBenefit, transportePublicoInsight } from "./transporte-publico-vs-bike";

const base = { monthlySpend: 300, currentMinutesPerDay: 100, bikeMinutesPerDay: 60, daysPerWeek: 5, dailyKm: 14 };

describe("0% + custo fixo (regra do motor)", () => {
  it("não atribui custo fixo à bike sem uso", () => {
    const r = computeCarroVsBike({ monthlySpend: 600, dailyKm: 20, daysPerWeek: 5, replaceablePercent: 0, keepsVehicle: false, fixedAvoidedMonthly: 400 });
    if (!r.ok) throw new Error();
    expect(r.data.currentFixedRemoved).toBe(0);
    expect(r.data.currentTotalReplaced).toBe(0);
    expect(r.data.monthlySavings).toBe(0);
  });
});

describe("Transporte público vs bike", () => {
  it("usa 100% do subconjunto informado", () => {
    const r = computeTransportePublicoVsBike(base);
    const ref = computeQuickMobilityCost({ modal: "transporte_publico", monthlySpend: 300, dailyKm: 14, daysPerWeek: 5, replaceablePercent: 100 });
    if (!r.ok || !ref.ok) throw new Error();
    expect(r.cost).toEqual(ref.data);
    expect(r.cost.currentTotalReplaced).toBe(300);
    expect(r.time.savedHoursPerYear).toBeCloseTo((40 * 5 * 52) / 60, 1);
    expect(r.dominant).toBe("ambos");
  });
  it("bike mais lenta: tempo negativo, sem forçar conclusão", () => {
    const r = computeTransportePublicoVsBike({ ...base, bikeMinutesPerDay: 140 });
    if (!r.ok) throw new Error();
    expect(r.time.savedHoursPerYear).toBeLessThan(0);
    expect(r.dominant).toBe("dinheiro");
    expect(transportePublicoInsight(r)).toMatch(/a mais por ano/);
  });
  it("gasto zero: economia negativa e nenhum benefício com tempo igual", () => {
    const r = computeTransportePublicoVsBike({ ...base, monthlySpend: 0, bikeMinutesPerDay: 100 });
    if (!r.ok) throw new Error();
    expect(r.cost.monthlySavings).toBeLessThan(0);
    expect(r.dominant).toBe("nenhum");
    expect(transportePublicoInsight(r)).toMatch(/transporte público segue melhor/);
  });
  it("rejeita custo e tempo negativos, juntando os erros das duas fontes", () => {
    const r = computeTransportePublicoVsBike({ ...base, monthlySpend: -1, bikeMinutesPerDay: -5 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
  it("regra dominante determinística", () => {
    expect(dominantBenefit(0, 10)).toBe("tempo");
    expect(dominantBenefit(0, 0)).toBe("nenhum");
  });
});
