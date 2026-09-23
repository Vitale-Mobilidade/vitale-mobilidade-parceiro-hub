/**
 * Configuração central das Ferramentas de Mobilidade.
 * Toda regra numérica compartilhada mora aqui — nenhum motor inventa constante local.
 * Valores são premissas explícitas, exibidas ao usuário na página e editáveis quando fazem parte do cenário dele.
 */

/** Semanas por ano consideradas por padrão. Editável pelo usuário nas rotas de tempo. */
export const WEEKS_PER_YEAR = 52;

/** Semanas por mês: 52 semanas / 12 meses. Explícito para não usar "4 semanas" implícito. */
export const WEEKS_PER_MONTH = WEEKS_PER_YEAR / 12;

/** Margem de segurança sobre a autonomia declarada do fabricante ao recomendar bikes. */
export const AUTONOMY_SAFETY_MARGIN = 1.2;

/**
 * Premissas operacionais centrais do modo rápido da calculadora.
 * São uma referência de cálculo, não garantia de custo real, e ficam expostas na metodologia da página.
 * O preço de compra da bike não entra na economia operacional; entra apenas nas projeções por modelo.
 */
export const QUICK_BIKE_COST = {
  energyPerKm: 0.05,
  maintenanceMonthly: 30,
} as const;

/** Horizontes exibidos na projeção acumulada. */
export const PROJECTION_MONTHS = [12, 24, 36] as const;

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
  /** Minutos por dia (ida + volta somados). */
  minutesPerDay: { min: 0, max: 1440 },
  weeksPerYear: { min: 1, max: 53 },
  /** Orçamento máximo opcional: quando informado, precisa ser plausível — nunca vira "sem limite". */
  budget: { min: 1, max: 200000 },
} as const;

/** Máximo de bikes sugeridas no resultado da calculadora. */
export const MAX_RECOMMENDATIONS = 3;

/** A experiência rápida compara no máximo duas opções reais. */
export const MAX_QUICK_RECOMMENDATIONS = 2;

/** Padrão oficial do link afiliado. Qualquer outro formato é descartado, nunca corrigido. */
export const MELI_LINK_RE = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/;

/** Arredondamento monetário em centavos (apenas na saída). */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Presets de orçamento máximo das calculadoras rápidas (filtro rígido quando escolhido). */
export const BUDGET_PRESETS = [5000, 7000, 10000, 15000] as const;

/** Alternativa só entra com vantagem verificável: ≥ 25% mais autonomia declarada ou mais lugares. */
export const RELEVANT_AUTONOMY_GAIN = 0.25;
