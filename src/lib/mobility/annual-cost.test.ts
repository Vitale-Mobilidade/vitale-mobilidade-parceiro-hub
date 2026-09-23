import { describe, expect, it } from "vitest";
import { computeAnnualMobilityCost } from "./cost-engine";

const base = { carMoto: 0, rideHailing: 0, publicTransport: 0, parkingOther: 0, replaceablePercent: 0 };

describe("MobilityCostEngine — custo anual", () => {
  it("tudo zero é válido e não tem categoria dominante", () => {
    const r = computeAnnualMobilityCost(base);
    expect(r.ok && r.data).toMatchObject({ monthlyTotal: 0, annualTotal: 0, replaceableMonthly: 0, largestCategory: null });
  });
  it("soma, anualiza e aplica percentual", () => {
    const r = computeAnnualMobilityCost({ carMoto: 600, rideHailing: 250.5, publicTransport: 100, parkingOther: 49.5, replaceablePercent: 30 });
    expect(r.ok && r.data).toEqual({ monthlyTotal: 1000, annualTotal: 12000, replaceableMonthly: 300, replaceableAnnual: 3600, largestCategory: "carMoto" });
  });
  it("0% e 100%", () => {
    const x = { ...base, rideHailing: 400 };
    const z = computeAnnualMobilityCost(x);
    const f = computeAnnualMobilityCost({ ...x, replaceablePercent: 100 });
    expect(z.ok && z.data.replaceableMonthly).toBe(0);
    expect(f.ok && f.data.replaceableAnnual).toBe(4800);
  });
  it("arredonda centavos", () => {
    const r = computeAnnualMobilityCost({ ...base, publicTransport: 100.33, replaceablePercent: 33 });
    expect(r.ok && r.data.replaceableMonthly).toBe(33.11);
  });
  it("recusa negativos, NaN e fora do limite", () => {
    expect(computeAnnualMobilityCost({ ...base, carMoto: -1 }).ok).toBe(false);
    expect(computeAnnualMobilityCost({ ...base, rideHailing: Number.NaN }).ok).toBe(false);
    expect(computeAnnualMobilityCost({ ...base, replaceablePercent: 101 }).ok).toBe(false);
    expect(computeAnnualMobilityCost({ ...base, parkingOther: 1e9 }).ok).toBe(false);
  });
});
