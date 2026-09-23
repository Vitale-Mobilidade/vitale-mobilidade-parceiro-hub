import { describe, expect, it } from "vitest";
import { computeCostProjection } from "./projection-engine";

describe("MobilityProjectionEngine", () => {
  it("calcula payback e saldos em 12, 24 e 36 meses", () => {
    const r = computeCostProjection({ monthlyCurrentCost: 500, monthlyBikeCost: 100, bikePrice: 8000 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.paybackMonths).toBe(20);
    expect(r.points.map((point) => point.netBalance)).toEqual([-3200, 1600, 6400]);
  });

  it("não cria payback quando a economia é zero ou negativa", () => {
    const zero = computeCostProjection({ monthlyCurrentCost: 100, monthlyBikeCost: 100, bikePrice: 5000 });
    const negative = computeCostProjection({ monthlyCurrentCost: 50, monthlyBikeCost: 100, bikePrice: 5000 });
    expect(zero.ok && zero.paybackMonths).toBeNull();
    expect(negative.ok && negative.paybackMonths).toBeNull();
  });

  it("recusa entradas negativas, inválidas e preço zero", () => {
    expect(computeCostProjection({ monthlyCurrentCost: -1, monthlyBikeCost: 10, bikePrice: 5000 }).ok).toBe(false);
    expect(computeCostProjection({ monthlyCurrentCost: 100, monthlyBikeCost: Number.NaN, bikePrice: 5000 }).ok).toBe(false);
    expect(computeCostProjection({ monthlyCurrentCost: 100, monthlyBikeCost: 10, bikePrice: 0 }).ok).toBe(false);
  });
});