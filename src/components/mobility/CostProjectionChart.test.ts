import { describe, expect, it } from "vitest";
import { buildProjectionChartPoints } from "./CostProjectionChart";
import { computeCostProjection } from "@/lib/mobility/projection-engine";

describe("CostProjectionChart — série acumulada", () => {
  it("usa o preço real da bike em 0m e preserva os pontos de 12/24/36 meses", () => {
    const bikePrice = 8_000;
    const projection = computeCostProjection({
      monthlyCurrentCost: 500,
      monthlyBikeCost: 100,
      bikePrice,
    });

    expect(projection.ok).toBe(true);
    if (!projection.ok) return;

    const series = buildProjectionChartPoints(projection.points, bikePrice);
    expect(series[0]).toEqual({ months: 0, currentRouteCost: 0, bikeCostWithPurchase: bikePrice });
    expect(series.slice(1)).toEqual(projection.points);
  });
});