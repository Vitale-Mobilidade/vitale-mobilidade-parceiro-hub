/**
 * Configuração central das Ferramentas de Mobilidade.
 * Toda regra numérica compartilhada mora aqui — nenhum motor inventa constante local.
 * Valores são premissas explícitas, exibidas ao usuário na página e editáveis quando fazem parte do cenário dele.
 */

/** Semanas por mês: 52 semanas / 12 meses. Explícito para não usar "4 semanas" implícito. */
export const WEEKS_PER_MONTH = 52 / 12;

/** Margem de segurança sobre a autonomia declarada do fabricante ao recomendar bikes. */
export const AUTONOMY_SAFETY_MARGIN = 1.2;

/** Limites de plausibilidade da entrada. Fora disso o cálculo é recusado, não "corrigido". */
export const LIMITS = {
  daysPerWeek: { min: 1, max: 7 },
  dailyKm: { min: 0.1, max: 400 },
  replaceablePercent: { min: 0, max: 100 },
  moneyPerUnit: { min: 0, max: 1000 },
  monthlyMoney: { min: 0, max: 100000 },
  kmPerLiter: { min: 1, max: 100 },
  tripsPerDay: { min: 1, max: 10 },
  speedKmh: { min: 1, max: 120 },
} as const;

/** Máximo de bikes sugeridas no resultado da calculadora. */
export const MAX_RECOMMENDATIONS = 3;

/** Padrão oficial do link afiliado. Qualquer outro formato é descartado, nunca corrigido. */
export const MELI_LINK_RE = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/;

/** Arredondamento monetário em centavos (apenas na saída). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
