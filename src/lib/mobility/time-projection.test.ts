import { describe, expect, it } from "vitest";
import { computeMobilityTime, computeTimeProjection } from "./time-engine";
import { buildTimeChartPoints } from "@/components/mobility/TimeProjectionChart";

describe("Projeção de tempo (1/3/5 anos)", () => {
  it("acumula horas/ano do motor e começa em 0", () => {
    const r = computeMobilityTime({ currentMinutesPerDay: 90, bikeMinutesPerDay: 60, daysPerWeek: 5 });
    if (!r.ok) throw new Error();
    const pts = computeTimeProjection(r.data);
    expect(pts.map((p) => p.years)).toEqual([1, 3, 5]);
    expect(pts[0].currentHours).toBe(390);
    expect(pts[0].savedHours).toBe(130);
    expect(pts[2].bikeHours).toBe(1300);
    expect(buildTimeChartPoints(pts)[0]).toEqual({ years: 0, currentHours: 0, bikeHours: 0, savedHours: 0 });
  });
  it("bike mais lenta gera diferença negativa; semanas/ano editáveis", () => {
    const r = computeMobilityTime({ currentMinutesPerDay: 40, bikeMinutesPerDay: 70, daysPerWeek: 5, weeksPerYear: 48 });
    if (!r.ok) throw new Error();
    expect(r.data.daysPerYear).toBe(240);
    expect(computeTimeProjection(r.data)[0].savedHours).toBe(-120);
  });
  it("zeros e inválidos", () => {
    const z = computeMobilityTime({ currentMinutesPerDay: 0, bikeMinutesPerDay: 0, daysPerWeek: 5 });
    if (!z.ok) throw new Error();
    expect(computeTimeProjection(z.data).every((p) => p.savedHours === 0)).toBe(true);
    expect(computeMobilityTime({ currentMinutesPerDay: -1, bikeMinutesPerDay: 10, daysPerWeek: 5 }).ok).toBe(false);
    expect(computeMobilityTime({ currentMinutesPerDay: 10, bikeMinutesPerDay: 10, daysPerWeek: 5, weeksPerYear: 60 }).ok).toBe(false);
  });
});
