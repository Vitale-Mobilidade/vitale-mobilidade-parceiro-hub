import { describe, expect, it } from "vitest";
import { computeQuickMobilityCost } from "./cost-engine";
import { carroVsBikeInsight, computeCarroVsBike } from "./carro-vs-bike";
import { computeVehicleVsBike, vehicleVsBikeInsight } from "./vehicle-vs-bike";

const base = { monthlySpend: 600, dailyKm: 20, daysPerWeek: 5, replaceablePercent: 50 };

describe("VehicleVsBike compartilhado", () => {
  it("regressão: Carro idêntico ao motor rápido com modal carro", () => {
    const r = computeCarroVsBike({ ...base, keepsVehicle: false, fixedAvoidedMonthly: 200 });
    const ref = computeQuickMobilityCost({ modal: "carro", ...base, keepsVehicle: false, fixedAvoidedMonthly: 200 });
    expect(r).toEqual(ref);
    expect(carroVsBikeInsight({ replaceablePercent: 50, monthlySavings: 100, annualSavings: 1200, keepsVehicle: true, fixedIncluded: 0 })).toMatch(/continuará com o carro/);
  });
  it("Moto usa modal moto e as mesmas regras de custo fixo", () => {
    const kept = computeVehicleVsBike({ vehicle: "moto", ...base, keepsVehicle: true, fixedAvoidedMonthly: 300 });
    const sold = computeVehicleVsBike({ vehicle: "moto", ...base, keepsVehicle: false, fixedAvoidedMonthly: 300 });
    const soldNoValue = computeVehicleVsBike({ vehicle: "moto", ...base, keepsVehicle: false });
    const zero = computeVehicleVsBike({ vehicle: "moto", ...base, replaceablePercent: 0, keepsVehicle: false, fixedAvoidedMonthly: 300 });
    if (!kept.ok || !sold.ok || !soldNoValue.ok || !zero.ok) throw new Error();
    expect(kept.data.currentFixedRemoved).toBe(0);
    expect(sold.data.currentFixedRemoved).toBe(300);
    expect(soldNoValue.data.monthlySavings).toBe(kept.data.monthlySavings);
    expect(zero.data.monthlySavings).toBe(0);
    expect(computeVehicleVsBike({ vehicle: "moto", ...base, monthlySpend: -1, keepsVehicle: true }).ok).toBe(false);
  });
  it("insight da moto fala da moto", () => {
    expect(vehicleVsBikeInsight({ vehicle: "moto", replaceablePercent: 50, monthlySavings: -10, annualSavings: -120, keepsVehicle: true, fixedIncluded: 0 })).toMatch(/da moto/);
    expect(vehicleVsBikeInsight({ vehicle: "moto", replaceablePercent: 50, monthlySavings: 100, annualSavings: 1200, keepsVehicle: true, fixedIncluded: 0 })).toMatch(/continuará com a moto/);
  });
});
