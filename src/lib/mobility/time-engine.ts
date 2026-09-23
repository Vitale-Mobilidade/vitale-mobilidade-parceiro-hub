/**
 * MobilityTimeEngine — base compartilhada de tempo de deslocamento.
 * Puro e determinístico; usa apenas velocidades informadas pelo usuário.
 * Fundação para rotas futuras (tempo/payback). Nenhuma velocidade é presumida aqui.
 */
import { LIMITS, WEEKS_PER_MONTH, roundMoney } from "./config";

export type TimeInput = {
  dailyKm: number;
  daysPerWeek: number;
  /** Velocidade média atual porta a porta (km/h), informada pelo usuário. */
  currentSpeedKmh: number;
  /** Velocidade média estimada de bike (km/h), informada pelo usuário. */
  bikeSpeedKmh: number;
};

export type TimeBreakdown = {
  currentMinutesPerDay: number;
  bikeMinutesPerDay: number;
  /** Positivo = a bike economiza tempo; negativo = a bike demora mais. */
  savedMinutesPerDay: number;
  savedHoursPerMonth: number;
};

export type TimeResult = { ok: true; data: TimeBreakdown } | { ok: false; errors: string[] };

const valid = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

export function computeMobilityTime(input: TimeInput): TimeResult {
  const errors: string[] = [];
  if (!valid(input.dailyKm, LIMITS.dailyKm.min, LIMITS.dailyKm.max)) errors.push("Distância por dia inválida.");
  if (!valid(input.daysPerWeek, LIMITS.daysPerWeek.min, LIMITS.daysPerWeek.max)) errors.push("Dias por semana inválidos.");
  if (!valid(input.currentSpeedKmh, LIMITS.speedKmh.min, LIMITS.speedKmh.max)) errors.push("Velocidade média atual inválida.");
  if (!valid(input.bikeSpeedKmh, LIMITS.speedKmh.min, LIMITS.speedKmh.max)) errors.push("Velocidade média de bike inválida.");
  if (errors.length > 0) return { ok: false, errors };

  const currentMinutesPerDay = (input.dailyKm / input.currentSpeedKmh) * 60;
  const bikeMinutesPerDay = (input.dailyKm / input.bikeSpeedKmh) * 60;
  const savedMinutesPerDay = currentMinutesPerDay - bikeMinutesPerDay;
  const monthlyDays = input.daysPerWeek * WEEKS_PER_MONTH;
  return {
    ok: true,
    data: {
      currentMinutesPerDay: roundMoney(currentMinutesPerDay),
      bikeMinutesPerDay: roundMoney(bikeMinutesPerDay),
      savedMinutesPerDay: roundMoney(savedMinutesPerDay),
      savedHoursPerMonth: roundMoney((savedMinutesPerDay * monthlyDays) / 60),
    },
  };
}

export const MobilityTimeEngine = { compute: computeMobilityTime };
