/**
 * Radar de Preços — camada DIÁRIA.
 *
 * O histórico de eventos (bike_price_history) guarda apenas mudanças. A série
 * diária (bike_price_daily) diz, para cada dia, qual era o preço de fechamento
 * confirmado e com que qualidade ele foi observado.
 *
 * Regras de honestidade:
 *  - Dia sem execução bem-sucedida é LACUNA, nunca preço repetido.
 *  - Dia reconstruído é sinalizado e não sustenta alegação forte.
 *  - Sem 14 dias verificados, sem 80% de cobertura ou com menos de 2 preços
 *    distintos, a leitura é "Histórico em formação".
 */

import type { Classification } from "./price-tracker";

export type Verification =
  | "observed_change"
  | "confirmed_unchanged"
  | "reconstructed"
  | "missing";

export interface DailyPoint {
  date: string; // YYYY-MM-DD (America/Sao_Paulo)
  close: number;
  low: number;
  high: number;
  verifiedRuns: number;
  lastVerifiedAt: string | null;
  changed: boolean;
  verification: Verification;
}

export interface DailyMetrics {
  /** Dias com confirmação real (observed_change ou confirmed_unchanged). */
  verifiedDays: number;
  /** Dias reconstruídos a partir das execuções antigas. */
  reconstructedDays: number;
  /** Dias esperados na janela (desde o primeiro dia conhecido). */
  expectedDays: number;
  coverage: number;
  minPrice: number | null;
  maxPrice: number | null;
  typicalPrice: number | null; // mediana dos fechamentos diários
  p25: number | null;
  p75: number | null;
  distinctPrices: number;
  previousPrice: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  classification: Classification;
  firstDay: string | null;
  lastDay: string | null;
  lastVerifiedAt: string | null;
  /** Série expandida dia a dia, com lacunas explícitas. */
  series: DailyPoint[];
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export type DailyWindow = 7 | 30 | 90 | "all";
export const DAILY_WINDOWS: DailyWindow[] = [7, 30, 90, "all"];
export const WINDOW_LABEL: Record<string, string> = {
  "7": "7 dias",
  "30": "30 dias",
  "90": "90 dias",
  all: "Tudo",
};

/** Remove acentos e caixa para busca tolerante. */
export function normalizeText(input: string): string {
  return (input ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

const SP_DAY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Dia civil em America/Sao_Paulo. Nunca use o dia UTC de toISOString: perto da
 * meia-noite UTC ainda é o dia anterior no Brasil (off-by-one na contagem).
 */
export function saoPauloDay(date: Date = new Date()): string {
  return SP_DAY.format(date);
}

export function toDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDay(key: string): number {
  return Date.parse(`${key}T12:00:00Z`);
}

export function addDays(key: string, delta: number): string {
  return toDayKey(new Date(parseDay(key) + delta * DAY_MS));
}

function isVerified(p: DailyPoint): boolean {
  return p.verification === "observed_change" || p.verification === "confirmed_unchanged";
}

function quantile(sorted: number[], q: number): number | null {
  if (sorted.length === 0) return null;
  if (sorted.length === 1) return sorted[0];
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1] ?? sorted[base];
  return sorted[base] + (next - sorted[base]) * rest;
}

function sanitize(series: DailyPoint[] | null | undefined): DailyPoint[] {
  return (series ?? [])
    .filter((p) => p && typeof p.close === "number" && p.close > 0 && !!p.date)
    .map((p) => ({
      ...p,
      date: String(p.date).slice(0, 10),
      close: Number(p.close),
      low: Number(p.low ?? p.close),
      high: Number(p.high ?? p.close),
      verifiedRuns: Number(p.verifiedRuns ?? 0),
      verification: (p.verification ?? "reconstructed") as Verification,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Expande a série para todos os dias entre o primeiro conhecido e hoje
 * (ou o fim da janela), marcando dias sem confirmação como `missing`.
 */
export function expandDaily(
  series: DailyPoint[],
  window: DailyWindow = 30,
  today: string = toDayKey(new Date()),
): DailyPoint[] {
  const clean = sanitize(series);
  if (clean.length === 0) return [];
  const firstKnown = clean[0].date;
  const start =
    window === "all"
      ? firstKnown
      : (() => {
          const candidate = addDays(today, -(window - 1));
          return candidate < firstKnown ? firstKnown : candidate;
        })();
  const byDate = new Map(clean.map((p) => [p.date, p]));
  const out: DailyPoint[] = [];
  let cursor = start;
  let guard = 0;
  while (cursor <= today && guard++ < 4000) {
    const hit = byDate.get(cursor);
    if (hit) {
      out.push(hit);
    } else if (cursor >= firstKnown) {
      out.push({
        date: cursor,
        close: NaN,
        low: NaN,
        high: NaN,
        verifiedRuns: 0,
        lastVerifiedAt: null,
        changed: false,
        verification: "missing",
      });
    }
    cursor = addDays(cursor, 1);
  }
  return out;
}

/** Métricas do período a partir dos fechamentos diários. */
export function dailyMetrics(
  input: { daily: DailyPoint[]; currentPrice: number },
  window: DailyWindow = 30,
  today: string = toDayKey(new Date()),
): DailyMetrics {
  const expanded = expandDaily(input.daily, window, today);
  const real = expanded.filter((p) => p.verification !== "missing");
  const verified = real.filter(isVerified);
  const reconstructed = real.filter((p) => p.verification === "reconstructed");

  const closes = real.map((p) => p.close);
  const sorted = [...closes].sort((a, b) => a - b);
  const distinct = Array.from(new Set(closes));

  const minPrice = real.length ? Math.min(...real.map((p) => p.low)) : null;
  const maxPrice = real.length ? Math.max(...real.map((p) => p.high)) : null;
  const typicalPrice = quantile(sorted, 0.5);
  const p25 = quantile(sorted, 0.25);
  const p75 = quantile(sorted, 0.75);

  let previousPrice: number | null = null;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] !== input.currentPrice) {
      previousPrice = closes[i];
      break;
    }
  }
  const deltaAbs = previousPrice === null ? null : input.currentPrice - previousPrice;
  const deltaPct = previousPrice ? ((deltaAbs as number) / previousPrice) * 100 : null;

  const expectedDays = expanded.length;
  const coverage = expectedDays > 0 ? verified.length / expectedDays : 0;

  const forming =
    verified.length < 14 || coverage < 0.8 || distinct.length < 2 || typicalPrice === null;

  let classification: Classification = "forming";
  if (!forming) {
    if (minPrice !== null && input.currentPrice <= minPrice) classification = "lowest";
    else if (p25 !== null && input.currentPrice <= p25) classification = "good";
    else if (p75 !== null && input.currentPrice <= p75) classification = "typical";
    else classification = "above";
  }

  const lastReal = real[real.length - 1] ?? null;

  return {
    verifiedDays: verified.length,
    reconstructedDays: reconstructed.length,
    expectedDays,
    coverage,
    minPrice,
    maxPrice,
    typicalPrice,
    p25,
    p75,
    distinctPrices: distinct.length,
    previousPrice,
    deltaAbs,
    deltaPct,
    classification,
    firstDay: real[0]?.date ?? null,
    lastDay: lastReal?.date ?? null,
    lastVerifiedAt: lastReal?.lastVerifiedAt ?? null,
    series: expanded,
  };
}

export const VERIFICATION_LABEL: Record<Verification, string> = {
  observed_change: "Mudança de preço confirmada",
  confirmed_unchanged: "Preço confirmado sem mudança",
  reconstructed: "Reconstruído do histórico",
  missing: "Sem verificação neste dia",
};

/** Posição do preço atual dentro da faixa mínimo–máximo (0 a 1). */
export function rangePosition(current: number, min: number | null, max: number | null): number | null {
  if (min === null || max === null || max <= min) return null;
  const pos = (current - min) / (max - min);
  return Math.min(Math.max(pos, 0), 1);
}

/** Distância percentual até o menor preço registrado. */
export function distanceToMinPct(current: number, min: number | null): number | null {
  if (min === null || min <= 0) return null;
  return ((current - min) / min) * 100;
}
