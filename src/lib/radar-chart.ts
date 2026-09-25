import type { DailyPoint } from "./price-daily";

const confirmed = (p: DailyPoint) => (p.verification === "observed_change" || p.verification === "confirmed_unchanged") && Number.isFinite(p.close) && p.close > 0;

/** Atípicos são pontos confirmados isolados da distribuição; reconstruções nunca contam. */
export function chartEvidence(series: DailyPoint[]) {
  const values = series.filter(confirmed).map(p => p.close).sort((a, b) => a - b);
  if (!values.length) return { domain: null, atypicalDates: new Set<string>() };
  const median = (xs: number[]) => xs[Math.floor(xs.length / 2)];
  const center = median(values);
  const deviations = values.map(v => Math.abs(v - center)).sort((a, b) => a - b);
  const mad = median(deviations);
  const atypicalDates = new Set<string>();
  const observations = series.filter(confirmed);
  if (values.length >= 5) for (const [i, p] of observations.entries()) {
    const threshold = Math.max(center * 0.2, mad * 3);
    const before = observations[i - 1];
    const after = observations[i + 1];
    // Só classificar um pico isolado quando há confirmação em ambos os lados.
    const isolated = Boolean(before && after && Math.abs(before.close - center) <= threshold && Math.abs(after.close - center) <= threshold);
    if (isolated && Math.abs(p.close - center) > threshold) atypicalDates.add(p.date);
  }
  const low = values[0];
  const high = values[values.length - 1];
  const padding = Math.max((high - low) * 0.1, center * 0.05, 1);
  return { domain: [Math.max(0, low - padding), high + padding] as [number, number], atypicalDates };
}