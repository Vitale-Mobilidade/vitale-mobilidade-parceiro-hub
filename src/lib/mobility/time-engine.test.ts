import { describe, expect, it } from "vitest";
import { computeMobilityTime } from "./time-engine";

describe("MobilityTimeEngine", () => {
  it("compara tempos a partir das velocidades informadas", () => {
    const r = computeMobilityTime({ dailyKm: 20, daysPerWeek: 5, currentSpeedKmh: 20, bikeSpeedKmh: 25 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.currentMinutesPerDay).toBeCloseTo(60, 2);
    expect(r.data.bikeMinutesPerDay).toBeCloseTo(48, 2);
    expect(r.data.savedMinutesPerDay).toBeCloseTo(12, 2);
  });

  it("aceita resultado negativo (bike mais lenta) e recusa entradas inválidas", () => {
    const slower = computeMobilityTime({ dailyKm: 10, daysPerWeek: 5, currentSpeedKmh: 40, bikeSpeedKmh: 20 });
    expect(slower.ok && slower.data.savedMinutesPerDay < 0).toBe(true);
    expect(computeMobilityTime({ dailyKm: 10, daysPerWeek: 5, currentSpeedKmh: 0, bikeSpeedKmh: 20 }).ok).toBe(false);
    expect(computeMobilityTime({ dailyKm: -1, daysPerWeek: 5, currentSpeedKmh: 20, bikeSpeedKmh: 20 }).ok).toBe(false);
  });
});
