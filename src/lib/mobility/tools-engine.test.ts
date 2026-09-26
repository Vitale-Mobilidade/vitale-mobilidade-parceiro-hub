import { describe, expect, it } from "vitest";
import {
  computeApps,
  computeDeliveryGoal,
  computeOwnedVehicle,
  computeRented,
  computeScheduledProjection,
  computeTimeSavings,
  computeTransit,
  deliveryBikeImpact,
  savingsOver,
} from "./tools-engine";
import { WEEKS_PER_MONTH } from "./config";

const bike = { energyPerKm: 0.05, maintenanceMonthly: 30 };

const car = {
  financed: false,
  vehicleValue: 60000,
  kmPerMonth: 600,
  kmPerLiter: 10,
  fuelPrice: 6,
  maintenanceMonthly: 200,
  ipvaAnnual: 2400,
  insuranceAnnual: 3600,
  otherMonthly: 100,
  opportunityRatePct: 8,
  daysPerWeek: 5,
  bike,
};

describe("carro/moto próprios", () => {
  it("soma combustível, manutenção, IPVA/seguro diluídos, outros e custo de oportunidade", () => {
    const r = computeOwnedVehicle(car);
    if (!r.ok) throw new Error(r.errors.join());
    expect(r.data.fuelMonthly).toBe(360);
    expect(r.data.ipvaMonthly).toBe(200);
    expect(r.data.insuranceMonthly).toBe(300);
    expect(r.data.opportunityMonthly).toBe(400);
    expect(r.data.currentMonthly).toBe(1560);
    expect(r.data.bikeMonthly).toBe(60);
    expect(r.data.monthlySavings).toBe(1500);
    expect(r.data.nextYearSavings).toBe(18000);
    expect(r.data.threeYearSavings).toBe(54000);
  });

  it("parcela entra só nos meses restantes e entrada já paga não é somada", () => {
    const r = computeOwnedVehicle({ ...car, financed: true, downPaymentPaid: 20000, installment: 1000, remainingInstallments: 6 });
    if (!r.ok) throw new Error();
    expect(r.data.currentMonthly).toBe(2560);
    expect(r.data.nextYearSavings).toBe(18000 + 6000);
    expect(r.data.threeYearSavings).toBe(54000 + 6000);
  });

  it("recusa valores inválidos", () => {
    expect(computeOwnedVehicle({ ...car, kmPerLiter: 0 }).ok).toBe(false);
    expect(computeOwnedVehicle({ ...car, financed: true, installment: 500, remainingInstallments: -1 }).ok).toBe(false);
  });
});

describe("projeção com cronograma", () => {
  it("sem parcela equivale ao payback linear", () => {
    const p = computeScheduledProjection({ baseMonthly: 530, bikeMonthly: 30, bikePrice: 5000 });
    if (!p.ok) throw new Error();
    expect(p.paybackMonths).toBe(10);
    expect(p.points[0]).toEqual({ months: 12, currentRouteCost: 6360, bikeCostWithPurchase: 5360, netBalance: 1000 });
  });
  it("parcela acelera o payback só enquanto existe", () => {
    const p = computeScheduledProjection({ baseMonthly: 130, installment: 900, remainingInstallments: 2, bikeMonthly: 30, bikePrice: 3000 });
    if (!p.ok) throw new Error();
    // meses 1-2: 1000/mês → 2000; depois 100/mês → mais 10 meses
    expect(p.paybackMonths).toBe(12);
    expect(savingsOver(12, { baseMonthly: 130, installment: 900, remainingInstallments: 2, bikeMonthly: 30 })).toBe(3000);
  });
  it("economia <= 0 não tem payback", () => {
    const p = computeScheduledProjection({ baseMonthly: 20, bikeMonthly: 30, bikePrice: 5000 });
    if (!p.ok) throw new Error();
    expect(p.paybackMonths).toBeNull();
    expect(p.points[2].netBalance).toBeLessThan(0);
  });
});

describe("aplicativos e transporte público", () => {
  it("apps somam Uber, 99 e outros", () => {
    const r = computeApps({ uberMonthly: 300, ninetyNineMonthly: 200, otherMonthly: 0, kmPerMonth: 200, daysPerWeek: 5, bike });
    if (!r.ok) throw new Error();
    expect(r.data.currentMonthly).toBe(500);
    expect(r.data.bikeMonthly).toBe(40);
    expect(r.data.monthlySavings).toBe(460);
    expect(r.data.dailyKm).toBeCloseTo(200 / (5 * WEEKS_PER_MONTH), 2);
  });
  it("transporte público detalhado converte diário em mensal", () => {
    const r = computeTransit({ mode: "daily", busDaily: 10, metroDaily: 0, trainDaily: 0, daysPerWeek: 5, dailyKm: 10, bike });
    if (!r.ok) throw new Error();
    expect(r.data.currentMonthly).toBeCloseTo(10 * 5 * WEEKS_PER_MONTH, 1);
    expect(r.data.annualCurrent).toBeCloseTo(r.data.currentMonthly * 12, 1);
  });
  it("transporte público mensal zero mostra economia negativa", () => {
    const r = computeTransit({ mode: "monthly", monthlyTotal: 0, daysPerWeek: 5, dailyKm: 10, bike });
    if (!r.ok) throw new Error();
    expect(r.data.monthlySavings).toBeLessThan(0);
  });
});

describe("veículo alugado", () => {
  it("normaliza aluguel semanal e soma combustível/outros por dia", () => {
    const r = computeRented({ vehicle: "moto", rentValue: 300, frequency: "weekly", workDaysPerMonth: 22, kmPerDay: 80, fuelPerDay: 20, otherPerDay: 0, bike });
    if (!r.ok) throw new Error();
    expect(r.data.rentMonthly).toBe(1300);
    expect(r.data.currentMonthly).toBe(1300 + 440);
    expect(r.data.bikeMonthly).toBe(80 * 22 * 0.05 + 30);
  });
  it("aluguel diário multiplica pelos dias trabalhados", () => {
    const r = computeRented({ vehicle: "bicicleta", rentValue: 30, frequency: "daily", workDaysPerMonth: 20, kmPerDay: 40, bike });
    if (!r.ok) throw new Error();
    expect(r.data.rentMonthly).toBe(600);
  });
});

describe("meta de entregas", () => {
  it("arredonda entregas para cima (R$200 / R$7 = 29)", () => {
    const r = computeDeliveryGoal({ dailyTarget: 200, daysPerMonth: 22, avgPerDelivery: 7, kmPerDay: 60, costsPerDay: 20, bike });
    if (!r.ok) throw new Error();
    expect(r.data.deliveriesPerDay).toBe(29);
    expect(r.data.deliveriesPerMonth).toBe(638);
    expect(r.data.revenueMonthly).toBe(29 * 7 * 22);
    expect(r.data.costsMonthly).toBe(20 * 22 + 60 * 22 * 0.05 + 30);
  });
  it("divisão exata não soma entrega extra e promoções reduzem a necessidade", () => {
    const exact = computeDeliveryGoal({ dailyTarget: 210, daysPerMonth: 20, avgPerDelivery: 7, kmPerDay: 10, costsPerDay: 0, bike });
    const promo = computeDeliveryGoal({ dailyTarget: 210, daysPerMonth: 20, avgPerDelivery: 7, promoPerDay: 14, kmPerDay: 10, costsPerDay: 0, bike });
    if (!exact.ok || !promo.ok) throw new Error();
    expect(exact.data.deliveriesPerDay).toBe(30);
    expect(promo.data.deliveriesPerDay).toBe(28);
  });
  it("dias equivalentes e payback por bike; sem líquido positivo → null", () => {
    expect(deliveryBikeImpact(5000, { netMonthly: 2500, netPerDay: 125 })).toEqual({ daysEquivalent: 40, paybackMonths: 2 });
    expect(deliveryBikeImpact(5000, { netMonthly: -10, netPerDay: -1 })).toEqual({ daysEquivalent: null, paybackMonths: null });
  });
});

describe("economia de tempo", () => {
  it("estima o tempo de bike a 18 km/h quando vazio", () => {
    const r = computeTimeSavings({ minutesGo: 60, minutesBack: 60, daysPerWeek: 5, distanceKmPerTrip: 9 });
    if (!r.ok) throw new Error();
    expect(r.data.bikeTimeEstimated).toBe(true);
    expect(r.data.bikeMinutesPerTrip).toBe(30);
    expect(r.data.savedMinutesPerDay).toBe(60);
    expect(r.data.hoursPerWeek).toBe(5);
    expect(r.data.hoursPerYear).toBe(260);
    expect(r.data.fullDaysPerYear).toBe(10.8);
    expect(r.data.dailyKm).toBe(18);
  });
  it("usa o tempo informado e mostra perda de tempo quando a bike é mais lenta", () => {
    const r = computeTimeSavings({ minutesGo: 20, minutesBack: 20, daysPerWeek: 5, distanceKmPerTrip: 9, bikeMinutesPerTrip: 35 });
    if (!r.ok) throw new Error();
    expect(r.data.bikeTimeEstimated).toBe(false);
    expect(r.data.savedMinutesPerDay).toBe(-30);
    expect(r.data.hoursPerYear).toBeLessThan(0);
  });
});
