/**
 * Bikes sem oferta válida no Mercado Livre.
 *
 * Regras: o preço não é apagado nem inventado — mostramos o último preço REAL
 * já registrado pela Vitale, com a data, sempre rotulado como histórico.
 * O vermelho no gráfico significa INDISPONIBILIDADE da oferta, nunca avaliação
 * de preço alto.
 */

import { formatDateBR } from "./price-tracker";
import type { DailyPoint } from "./price-daily";

export const UNAVAILABLE_LEGEND =
  "Ponto vermelho: sem oferta disponível no Mercado Livre (indisponibilidade, não avaliação de preço).";

/** Mensagem exibida no tooltip/popover do ponto vermelho. */
export function unavailableMessage(dateISO: string | null | undefined): string {
  const when = dateISO ? formatDateBR(dateISO) : null;
  return when && when !== "—"
    ? `Sem oferta disponível no Mercado Livre no momento. Este é o último preço registrado pela Vitale em ${when}; pode não ser o preço de hoje.`
    : "Sem oferta disponível no Mercado Livre no momento. O preço exibido é o último registrado pela Vitale; pode não ser o preço de hoje.";
}

/** Índice do ponto mais recente com preço real (ignora lacunas). -1 se não houver. */
export function lastRealIndex(series: DailyPoint[]): number {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const p = series[i];
    if (p && p.verification !== "missing" && Number.isFinite(p.close)) return i;
  }
  return -1;
}
