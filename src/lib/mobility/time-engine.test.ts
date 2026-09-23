import { describe, expect, it } from "vitest";
import { computeMobilityTime } from "./time-engine";

describe("MobilityTimeEngine", () => {
  it("converte minutos informados em horas/ano, dias de 24h e jornadas de 8h", () => {
    const r = computeMobilityTime({
      currentMinutesPerDay: 80,
      bikeMinutesPerDay: 50,
      daysPerWeek: 5,
      weeksPerYear: 48,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.daysPerYear).toBe(240);
    expect(r.data.savedMinutesPerDay).toBe(30);
    expect(r.data.currentHoursPerYear).toBeCloseTo(320, 2);
    expect(r.data.savedHoursPerYear).toBeCloseTo(120, 2);
    expect(r.data.savedFullDaysPerYear).toBeCloseTo(5, 2);
    expect(r.data.savedWorkdaysPerYear).toBeCloseTo(15, 2);
  });

  it("usa 52 semanas por ano como padrão explícito e zera a economia sem cenário de bike", () => {
    const r = computeMobilityTime({ currentMinutesPerDay: 60, daysPerWeek: 5 });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.data.daysPerYear).toBe(260);
    expect(r.data.bikeMinutesPerDay).toBeNull();
    expect(r.data.savedMinutesPerDay).toBe(0);
    expect(r.data.savedHoursPerYear).toBe(0);
    expect(r.data.savedWorkdaysPerYear).toBe(0);
  });

  it("aceita zero e resultado negativo sem inventar velocidade", () => {
    const zero = computeMobilityTime({ currentMinutesPerDay: 0, bikeMinutesPerDay: 0, daysPerWeek: 3 });
    expect(zero.ok).toBe(true);
    if (zero.ok) {
      expect(zero.data.savedMinutesPerDay).toBe(0);
      expect(zero.data.savedHoursPerYear).toBe(0);
    }
    const slower = computeMobilityTime({ currentMinutesPerDay: 30, bikeMinutesPerDay: 45, daysPerWeek: 5 });
    expect(slower.ok).toBe(true);
    if (slower.ok) {
      expect(slower.data.savedMinutesPerDay).toBe(-15);
      expect(slower.data.savedHoursPerYear).toBeLessThan(0);
      expect(slower.data.savedWorkdaysPerYear).toBeLessThan(0);
    }
  });

  it("recusa entradas inválidas em vez de corrigi-las", () => {
    expect(computeMobilityTime({ currentMinutesPerDay: Number.NaN, daysPerWeek: 5 }).ok).toBe(false);
    expect(computeMobilityTime({ currentMinutesPerDay: -10, daysPerWeek: 5 }).ok).toBe(false);
    expect(computeMobilityTime({ currentMinutesPerDay: 60, daysPerWeek: 0 }).ok).toBe(false);
    expect(computeMobilityTime({ currentMinutesPerDay: 60, daysPerWeek: 5, weeksPerYear: 0 }).ok).toBe(false);
    expect(
      computeMobilityTime({ currentMinutesPerDay: 60, bikeMinutesPerDay: 2000, daysPerWeek: 5 }).ok,
    ).toBe(false);
  });
});
