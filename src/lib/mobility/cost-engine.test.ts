import { describe, expect, it } from "vitest";
import { computeMobilityCost, computeQuickMobilityCost, computeAnnualMobilityCost, normalizeOptionalSpend, MobilityCostEngine, type CostInput } from "./cost-engine";
import { QUICK_BIKE_COST, WEEKS_PER_MONTH } from "./config";

const bike = { energyCostPerKm: 0.05, maintenanceMonthly: 30 };

const carInput = (over: Partial<CostInput> = {}): CostInput => ({
  modal: "carro",
  daysPerWeek: 5,
  dailyKm: 20,
  replaceablePercent: 100,
  vehicle: {
    fuelPricePerLiter: 6,
    kmPerLiter: 10,
    variableExtrasMonthly: 200,
    fixedMonthly: 500,
    keepsVehicle: true,
  },
  bike,
  ...over,
});

describe("MobilityCostEngine", () => {
  it("usa 52/12 semanas por mês e calcula economia com veículo mantido (fixos fora)", () => {
    const r = computeMobilityCost(carInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const days = 5 * WEEKS_PER_MONTH;
    const km = days * 20;
    expect(r.data.monthlyKm).toBeCloseTo(km, 2);
    expect(r.data.currentFixedRemoved).toBe(0);
    expect(r.data.fixedExcludedBecauseVehicleKept).toBe(true);
    expect(r.data.currentVariableReplaced).toBeCloseTo(km * 0.6 + 200, 1);
    expect(r.data.bikeTotalCost).toBeCloseTo(km * 0.05 + 30, 1);
    expect(r.data.annualSavings).toBeCloseTo(r.data.monthlySavings * 12, 2);
  });

  it("inclui custos fixos apenas quando o usuário deixa de manter o veículo", () => {
    const kept = computeMobilityCost(carInput());
    const sold = computeMobilityCost(
      carInput({ vehicle: { ...carInput().vehicle!, keepsVehicle: false } }),
    );
    expect(kept.ok && sold.ok).toBe(true);
    if (!kept.ok || !sold.ok) return;
    expect(sold.data.currentFixedRemoved).toBe(500);
    expect(sold.data.monthlySavings - kept.data.monthlySavings).toBeCloseTo(500, 2);
  });

  it("percentual 0 zera custo substituído e uso da bike", () => {
    const r = computeMobilityCost(carInput({ replaceablePercent: 0 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.replacedKm).toBe(0);
    expect(r.data.currentTotalReplaced).toBe(0);
    expect(r.data.bikeTotalCost).toBe(0);
    expect(r.data.monthlySavings).toBe(0);
    expect(r.data.annualSavings).toBe(0);
  });

  it("percentual 100 substitui todos os km do mês", () => {
    const r = computeMobilityCost(carInput({ replaceablePercent: 100 }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.replacedKm).toBeCloseTo(r.data.monthlyKm, 2);
  });

  it("mostra economia negativa honestamente", () => {
    const r = computeMobilityCost(
      carInput({
        vehicle: { fuelPricePerLiter: 1, kmPerLiter: 100, variableExtrasMonthly: 0, fixedMonthly: 0, keepsVehicle: true },
        bike: { energyCostPerKm: 0.5, maintenanceMonthly: 300 },
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.monthlySavings).toBeLessThan(0);
    expect(r.data.annualSavings).toBeCloseTo(r.data.monthlySavings * 12, 2);
  });

  it("recusa entradas inválidas, negativas ou fora dos limites, sem dividir por zero", () => {
    expect(computeMobilityCost(carInput({ dailyKm: -1 })).ok).toBe(false);
    expect(computeMobilityCost(carInput({ dailyKm: Number.NaN })).ok).toBe(false);
    expect(computeMobilityCost(carInput({ daysPerWeek: 9 })).ok).toBe(false);
    expect(computeMobilityCost(carInput({ replaceablePercent: 140 })).ok).toBe(false);
    const zeroConsumption = computeMobilityCost(
      carInput({ vehicle: { ...carInput().vehicle!, kmPerLiter: 0 } }),
    );
    expect(zeroConsumption.ok).toBe(false);
  });

  it("calcula transporte público por embarque e arredonda em centavos", () => {
    const r = computeMobilityCost({
      modal: "transporte_publico",
      daysPerWeek: 5,
      dailyKm: 12,
      replaceablePercent: 50,
      transit: { farePerTrip: 4.4, tripsPerDay: 2 },
      bike: { energyCostPerKm: 0.04, maintenanceMonthly: 20 },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const days = 5 * WEEKS_PER_MONTH;
    expect(r.data.currentVariableReplaced).toBeCloseTo(4.4 * 2 * days * 0.5, 1);
    expect(Number.isInteger(r.data.monthlySavings * 100)).toBe(true);
  });

  it("uber e misto usam as entradas do próprio modal", () => {
    const uber = computeMobilityCost({
      modal: "uber",
      daysPerWeek: 4,
      dailyKm: 10,
      replaceablePercent: 100,
      ridePricePerKm: 3,
      bike: { energyCostPerKm: 0, maintenanceMonthly: 0 },
    });
    const misto = computeMobilityCost({
      modal: "misto",
      daysPerWeek: 4,
      dailyKm: 10,
      replaceablePercent: 50,
      mixedMonthlySpend: 600,
      bike: { energyCostPerKm: 0, maintenanceMonthly: 0 },
    });
    expect(uber.ok && misto.ok).toBe(true);
    if (!uber.ok || !misto.ok) return;
    expect(uber.data.currentVariableReplaced).toBeCloseTo(uber.data.replacedKm * 3, 1);
    expect(misto.data.currentVariableReplaced).toBeCloseTo(300, 2);
  });
});

describe("MobilityCostEngine — decisão sobre o veículo", () => {
  const base = {
    modal: "carro" as const,
    daysPerWeek: 5,
    dailyKm: 20,
    replaceablePercent: 100,
    bike: { energyCostPerKm: 0.05, maintenanceMonthly: 30 },
  };
  const vehicle = {
    fuelPricePerLiter: 6,
    kmPerLiter: 10,
    variableExtrasMonthly: 0,
    fixedMonthly: 800,
  };

  it("recusa o cálculo quando a resposta sobre manter o veículo não foi dada", () => {
    const r = computeMobilityCost({
      ...base,
      vehicle: { ...vehicle, keepsVehicle: undefined as unknown as boolean },
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(" ")).toContain("Manter o veículo");
  });

  it("só inclui custo fixo quando o usuário declara que deixará de manter o veículo", () => {
    const kept = computeMobilityCost({ ...base, vehicle: { ...vehicle, keepsVehicle: true } });
    const sold = computeMobilityCost({ ...base, vehicle: { ...vehicle, keepsVehicle: false } });
    expect(kept.ok && kept.data.currentFixedRemoved).toBe(0);
    expect(sold.ok && sold.data.currentFixedRemoved).toBe(800);
  });
});

describe("MobilityCostEngine — modo rápido", () => {
  const quick = {
    modal: "carro" as const,
    monthlySpend: 1000,
    daysPerWeek: 5,
    dailyKm: 20,
    replaceablePercent: 50,
  };

  it("usa gasto substituível e as premissas centrais da bike", () => {
    const r = computeQuickMobilityCost(quick);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const replacedKm = 20 * 5 * WEEKS_PER_MONTH * 0.5;
    expect(r.data.currentTotalReplaced).toBe(500);
    expect(r.data.bikeEnergyCost).toBeCloseTo(replacedKm * QUICK_BIKE_COST.energyPerKm, 2);
    expect(r.data.bikeMaintenanceCost).toBe(QUICK_BIKE_COST.maintenanceMonthly);
    expect(r.data.annualSavings).toBe(r.data.monthlySavings * 12);
  });

  it("com 0% zera custo, economia e uso da bike", () => {
    const r = computeQuickMobilityCost({ ...quick, replaceablePercent: 0 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.currentTotalReplaced).toBe(0);
    expect(r.data.bikeTotalCost).toBe(0);
    expect(r.data.monthlySavings).toBe(0);
  });

  it("recusa negativos, não finitos e limites inválidos", () => {
    expect(computeQuickMobilityCost({ ...quick, monthlySpend: -1 }).ok).toBe(false);
    expect(computeQuickMobilityCost({ ...quick, dailyKm: Number.NaN }).ok).toBe(false);
    expect(computeQuickMobilityCost({ ...quick, daysPerWeek: 8 }).ok).toBe(false);
  });

  it("preserva economia negativa sem criar payback", () => {
    const r = computeQuickMobilityCost({ ...quick, monthlySpend: 0, replaceablePercent: 100 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.monthlySavings).toBeLessThan(0);
  });
});

describe("normalizeOptionalSpend — categorias de gasto opcionais", () => {
  it("branco é ausente: sem erro e sem valor, nunca inventa resultado", () => {
    expect(normalizeOptionalSpend("", "Carro ou moto")).toEqual({ value: 0, provided: false, error: null });
    expect(normalizeOptionalSpend("   ", "Uber / 99")).toEqual({ value: 0, provided: false, error: null });
  });

  it("0 digitado conta como preenchido (resultado 0 honesto)", () => {
    expect(normalizeOptionalSpend("0", "Carro ou moto")).toEqual({ value: 0, provided: true, error: null });
  });

  it("aceita número válido com vírgula e rejeita negativo, NaN e fora de limite", () => {
    expect(normalizeOptionalSpend("600,50", "Carro ou moto")).toEqual({ value: 600.5, provided: true, error: null });
    expect(normalizeOptionalSpend("-1", "Carro ou moto").error).toMatch(/não negativo/);
    expect(normalizeOptionalSpend("abc", "Carro ou moto").error).toBeTruthy();
    expect(normalizeOptionalSpend("9999999999", "Carro ou moto").error).toMatch(/intervalo/);
  });

  it("categorias em branco passam como 0 ao motor sem erro, com 0 digitado honesto", () => {
    const r = computeAnnualMobilityCost({
      carMoto: 0, rideHailing: 0, publicTransport: 0, parkingOther: 0, replaceablePercent: 50,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.monthlyTotal).toBe(0);
    expect(r.data.replaceableAnnual).toBe(0);
  });
});

describe("MobilityCostEngine — exportação agregada", () => {
  it("expõe compute, computeQuick e computeAnnual", () => {
    expect(MobilityCostEngine.compute).toBe(computeMobilityCost);
    expect(MobilityCostEngine.computeQuick).toBe(computeQuickMobilityCost);
    expect(MobilityCostEngine.computeAnnual).toBe(computeAnnualMobilityCost);
  });
});
