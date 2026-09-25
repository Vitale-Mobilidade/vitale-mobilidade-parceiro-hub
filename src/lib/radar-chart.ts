import type { DailyPoint } from "./price-daily";

/** Escala factual do gráfico: todos os preços disponíveis cabem no eixo vertical. */
export function chartEvidence(series: DailyPoint[]) {
  const allAvailable = series.filter(p => p.verification !== "missing" && Number.isFinite(p.close) && p.close > 0).map(p => p.close);
  if (!allAvailable.length) return { domain: null };
  const high = Math.max(...allAvailable);
  // O zero dá contexto ao valor; a folga superior mantém picos reais legíveis.
  const ceiling = Math.ceil((high + 2000) / 500) * 500;
  return { domain: [0, ceiling] as [number, number] };
}

/** Escala focada nas variações dos preços disponíveis para o destaque do Radar. */
export function chartVariationDomain(series: DailyPoint[]): [number, number] | null {
  const available = series.filter(p => p.verification !== "missing" && Number.isFinite(p.close) && p.close > 0).map(p => p.close);
  if (!available.length) return null;
  const min = Math.min(...available);
  const max = Math.max(...available);
  const spread = max - min;
  const padding = spread > 0 ? Math.max(250, spread * 0.15) : Math.max(500, max * 0.05);
  return [Math.max(0, Math.floor((min - padding) / 100) * 100), Math.ceil((max + padding) / 100) * 100];
}
