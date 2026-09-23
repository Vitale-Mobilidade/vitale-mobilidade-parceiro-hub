/**
 * MobilityTimeEngine — fundação pura de tempo de deslocamento.
 *
 * Contrato (alinhado às rotas futuras do hub): o usuário informa MINUTOS POR DIA
 * (já somando ida + volta). Nenhuma velocidade é presumida nem derivada de distância.
 * Quando existe cenário alternativo (bike), ele também vem em minutos por dia informados.
 *
 * Fórmulas:
 *   minutosEconomizadosPorDia = minutosAtuais - minutosDeBike (0 quando não há cenário bike)
 *   diasPorAno   = diasPorSemana * semanasPorAno (semanas por ano editáveis; padrão explícito 52)
 *   horasPorAno  = (minutosPorDia * diasPorAno) / 60
 *   diasCompletos (24h) = horasPorAno / 24
 *   jornadas de 8h      = horasPorAno / 8
 *
 * Resultado negativo (bike mais lenta) é devolvido como está. Zero é zero.
 */
import { LIMITS, WEEKS_PER_YEAR } from "./config";

export type TimeInput = {
  /** Minutos por dia no cenário atual, ida + volta, informados pelo usuário. */
  currentMinutesPerDay: number;
  /** Minutos por dia no cenário de bike, ida + volta. Omitido = sem cenário alternativo. */
  bikeMinutesPerDay?: number;
  daysPerWeek: number;
  /** Semanas por ano consideradas (editável; padrão explícito 52). */
  weeksPerYear?: number;
};

export type TimeBreakdown = {
  daysPerYear: number;
  currentMinutesPerDay: number;
  bikeMinutesPerDay: number | null;
  /** Positivo = a bike economiza tempo; negativo = a bike demora mais; 0 = igual ou sem cenário bike. */
  savedMinutesPerDay: number;
  currentHoursPerYear: number;
  bikeHoursPerYear: number | null;
  savedHoursPerYear: number;
  /** Horas economizadas por ano convertidas em dias de 24h. */
  savedFullDaysPerYear: number;
  /** Horas economizadas por ano convertidas em jornadas de 8h. */
  savedWorkdaysPerYear: number;
};

export type TimeResult = { ok: true; data: TimeBreakdown } | { ok: false; errors: string[] };

const inRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;

const round2 = (v: number) => Math.round(v * 100) / 100;

export function computeMobilityTime(input: TimeInput): TimeResult {
  const errors: string[] = [];

  if (!inRange(input.currentMinutesPerDay, LIMITS.minutesPerDay.min, LIMITS.minutesPerDay.max)) {
    errors.push("Minutos por dia hoje: informe um número entre 0 e 1440 (ida + volta).");
  }
  const hasBike = input.bikeMinutesPerDay !== undefined && input.bikeMinutesPerDay !== null;
  if (hasBike && !inRange(input.bikeMinutesPerDay, LIMITS.minutesPerDay.min, LIMITS.minutesPerDay.max)) {
    errors.push("Minutos por dia de bike: informe um número entre 0 e 1440 (ida + volta).");
  }
  if (!inRange(input.daysPerWeek, LIMITS.daysPerWeek.min, LIMITS.daysPerWeek.max)) {
    errors.push("Dias por semana: informe um número entre 1 e 7.");
  }
  const weeks = input.weeksPerYear === undefined ? WEEKS_PER_YEAR : input.weeksPerYear;
  if (!inRange(weeks, LIMITS.weeksPerYear.min, LIMITS.weeksPerYear.max)) {
    errors.push("Semanas por ano: informe um número entre 1 e 53.");
  }
  if (errors.length > 0) return { ok: false, errors };

  const current = input.currentMinutesPerDay;
  const bike = hasBike ? (input.bikeMinutesPerDay as number) : null;
  const savedMinutesPerDay = bike === null ? 0 : current - bike;
  const daysPerYear = input.daysPerWeek * weeks;
  const hoursPerYear = (minutes: number) => (minutes * daysPerYear) / 60;
  const savedHoursPerYear = hoursPerYear(savedMinutesPerDay);

  return {
    ok: true,
    data: {
      daysPerYear: round2(daysPerYear),
      currentMinutesPerDay: round2(current),
      bikeMinutesPerDay: bike === null ? null : round2(bike),
      savedMinutesPerDay: round2(savedMinutesPerDay),
      currentHoursPerYear: round2(hoursPerYear(current)),
      bikeHoursPerYear: bike === null ? null : round2(hoursPerYear(bike)),
      savedHoursPerYear: round2(savedHoursPerYear),
      savedFullDaysPerYear: round2(savedHoursPerYear / 24),
      savedWorkdaysPerYear: round2(savedHoursPerYear / 8),
    },
  };
}

export const MobilityTimeEngine = { compute: computeMobilityTime };

/** Horizontes (anos) da projeção de tempo. */
export const TIME_PROJECTION_YEARS = [1, 3, 5] as const;

export type TimeProjectionPoint = { years: number; currentHours: number; bikeHours: number; savedHours: number };

/** Projeção pura: acumula as horas/ano já calculadas pelo motor; nada é estimado além disso. */
export function computeTimeProjection(data: Pick<TimeBreakdown, "currentHoursPerYear" | "bikeHoursPerYear">): TimeProjectionPoint[] {
  const bike = data.bikeHoursPerYear ?? data.currentHoursPerYear;
  return TIME_PROJECTION_YEARS.map((years) => ({
    years,
    currentHours: round2(data.currentHoursPerYear * years),
    bikeHours: round2(bike * years),
    savedHours: round2((data.currentHoursPerYear - bike) * years),
  }));
}
