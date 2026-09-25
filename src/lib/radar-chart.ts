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
