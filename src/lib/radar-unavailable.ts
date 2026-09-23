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

/**
 * Mensagem do tooltip/popover do ponto vermelho.
 * A data deve ser a da ÚLTIMA CONFIRMAÇÃO diária (`bike_price_daily`), não a do
 * último evento de mudança — o preço foi confirmado pelo time naquele dia.
 */
export function unavailableMessage(dateISO: string | null | undefined): string {
  const when = dateISO ? formatDateBR(dateISO) : null;
  return when && when !== "—"
    ? `Sem oferta disponível no Mercado Livre no momento. Este preço foi confirmado pela Vitale em ${when}; pode não ser o preço de hoje.`
    : "Sem oferta disponível no Mercado Livre no momento. O preço exibido é o último confirmado pela Vitale; pode não ser o preço de hoje.";
}

/**
 * Último dia com confirmação real na série diária (`observed_change` ou
 * `confirmed_unchanged`). É a data correta de "último preço verificado";
 * `lastObservedAt` do histórico de eventos é a última ALTERAÇÃO de preço.
 */
export function lastConfirmedDay(series: DailyPoint[] | null | undefined): { date: string; close: number } | null {
  const list = Array.isArray(series) ? series : [];
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    if (
      p &&
      (p.verification === "observed_change" || p.verification === "confirmed_unchanged") &&
      Number.isFinite(p.close)
    ) {
      return { date: p.date, close: p.close };
    }
  }
  return null;
}

/** Índice do ponto mais recente com preço real (ignora lacunas). -1 se não houver. */
export function lastRealIndex(series: DailyPoint[]): number {
  for (let i = series.length - 1; i >= 0; i -= 1) {
    const p = series[i];
    if (p && p.verification !== "missing" && Number.isFinite(p.close)) return i;
  }
  return -1;
}
