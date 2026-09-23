/**
 * BikeRecommendationEngine — seleção determinística de bikes compatíveis com o cenário da calculadora.
 * Só trabalha com dados reais já validados pela camada de servidor (elegibilidade do Quiz +
 * oferta atômica atual do catálogo público). Não inventa score, preço, autonomia nem link.
 * Não altera nem reproduz o resultado do Quiz: aqui só há filtro verificável + ordenação explicada.
 */
import {
  AUTONOMY_SAFETY_MARGIN,
  LIMITS,
  MAX_QUICK_RECOMMENDATIONS,
  MAX_RECOMMENDATIONS,
  MELI_LINK_RE,
  RELEVANT_AUTONOMY_GAIN,
} from "./config";

export type MobilityBikeCandidate = {
  bikeId: string;
  slug: string;
  name: string;
  image: string | null;
  /** Preço da oferta atual (mesma linha do link). */
  price: number;
  /** Link afiliado byte a byte como registrado. */
  link: string;
  autonomyKm: number | null;
  capacity: number | null;
  /** true apenas quando a bike realmente tem histórico no Radar. */
  monitored: boolean;
};

export type RecommendationCriteria = {
  dailyKm: number;
  needsPassenger: boolean;
  /**
   * Orçamento máximo é opcional: `null` significa "não filtrar por preço".
   * Qualquer outro valor precisa ser plausível — entrada inválida é RECUSADA,
   * nunca convertida silenciosamente em "sem limite".
   */
  maxBudget: number | null;
};

export type RecommendedBike = MobilityBikeCandidate & {
  reason: string;
  /** Só no modo rápido: papel verificável na comparação. */
  role?: "economica" | "alternativa";
  /** Reais abaixo do teto informado (null = sem teto). */
  budgetRemaining?: number | null;
  /** Diferença real versus a opção econômica (só na alternativa). */
  tradeoff?: { extraPrice: number; extraAutonomyKm: number; extraCapacity: number };
};

export type RecommendationResult =
  | { ok: true; bikes: RecommendedBike[]; eligibleCount?: number }
  | { ok: false; errors: string[] };

export const ORDER_CRITERION =
  "Ordenamos pelo menor preço da oferta atual entre as bikes que atendem à sua distância diária (com margem de 20% sobre a autonomia declarada) e, em caso de empate, pela maior autonomia.";

export const QUICK_ORDER_CRITERION =
  "Filtramos só por dados verificáveis: autonomia declarada que cobre sua distância diária com 20% de margem, garupa e teto de preço quando informados. A primeira é a compra compatível de menor preço; a segunda só aparece se tiver pelo menos 25% mais autonomia ou mais lugares, e é a mais barata entre as que têm essa vantagem.";

const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export function recommendBikes(
  candidates: MobilityBikeCandidate[],
  criteria: RecommendationCriteria,
): RecommendationResult {
  const errors: string[] = [];
  if (!Array.isArray(candidates)) errors.push("Catálogo indisponível para comparar modelos.");
  if (!finitePositive(criteria.dailyKm)) {
    errors.push("Distância por dia: informe um número maior que zero para comparar modelos.");
  }
  // Orçamento é opcional, mas quando vem preenchido precisa ser válido: entrada ruim é recusada.
  const budget = criteria.maxBudget;
  const budgetInformed = budget !== null && budget !== undefined;
  if (
    budgetInformed &&
    !(finitePositive(budget) && budget >= LIMITS.budget.min && budget <= LIMITS.budget.max)
  ) {
    errors.push(
      `Orçamento máximo: informe um valor entre ${LIMITS.budget.min} e ${LIMITS.budget.max} reais, ou deixe o campo em branco para não filtrar por preço.`,
    );
  }
  if (errors.length > 0) return { ok: false, errors };

  const requiredKm = criteria.dailyKm * AUTONOMY_SAFETY_MARGIN;

  const eligible = candidates.filter((b) => {
    if (!b || typeof b.bikeId !== "string" || !b.bikeId) return false;
    if (typeof b.link !== "string" || !MELI_LINK_RE.test(b.link)) return false;
    if (!finitePositive(b.price)) return false;
    // Autonomia só conta quando é dado confiável; sem número, a bike não entra.
    if (!finitePositive(b.autonomyKm) || b.autonomyKm < requiredKm) return false;
    if (criteria.needsPassenger && !(finitePositive(b.capacity) && (b.capacity as number) >= 2)) return false;
    if (finitePositive(criteria.maxBudget) && b.price > (criteria.maxBudget as number)) return false;
    return true;
  });

  const sorted = [...eligible].sort(
    (a, b) =>
      a.price - b.price ||
      (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) ||
      a.bikeId.localeCompare(b.bikeId),
  );

  return {
    ok: true,
    bikes: sorted.slice(0, MAX_RECOMMENDATIONS).map((b) => ({ ...b, reason: buildReason(b, criteria) })),
  };
}

/** Seleciona até duas opções complementares sem score ou rótulo de “melhor bike”. */
export function recommendQuickComparison(
  candidates: MobilityBikeCandidate[],
  criteria: RecommendationCriteria,
): RecommendationResult {
  const all = recommendBikes(candidates, criteria);
  if (!all.ok) return all;

  // recommendBikes preserva o contrato público antigo de até 3; refazemos apenas o conjunto
  // elegível quando há mais candidatas para que a alternativa considere toda a base real.
  const requiredKm = criteria.dailyKm * AUTONOMY_SAFETY_MARGIN;
  const eligible = candidates.filter((b) => {
    if (!b || typeof b.bikeId !== "string" || !b.bikeId) return false;
    if (typeof b.link !== "string" || !MELI_LINK_RE.test(b.link) || !finitePositive(b.price)) return false;
    if (!finitePositive(b.autonomyKm) || b.autonomyKm < requiredKm) return false;
    if (criteria.needsPassenger && !(finitePositive(b.capacity) && b.capacity >= 2)) return false;
    if (finitePositive(criteria.maxBudget) && b.price > criteria.maxBudget) return false;
    return true;
  });
  const byPrice = [...eligible].sort(
    (a, b) => a.price - b.price || (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) || a.bikeId.localeCompare(b.bikeId),
  );
  const first = byPrice[0];
  if (!first) return { ok: true, bikes: [], eligibleCount: 0 };
  const alternative = pickAlternative(first, byPrice);
  const budget = finitePositive(criteria.maxBudget) ? criteria.maxBudget : null;
  const remaining = (b: MobilityBikeCandidate) => (budget === null ? null : Math.round((budget - b.price) * 100) / 100);
  const bikes: RecommendedBike[] = [
    {
      ...first,
      role: "economica",
      budgetRemaining: remaining(first),
      reason: `Menor preço entre as ${byPrice.length} bike${byPrice.length > 1 ? "s" : ""} com oferta atual compatíve${byPrice.length > 1 ? "is" : "l"} com seu cenário. ${buildReason(first, criteria)}`,
    },
  ];
  if (alternative) {
    const tradeoff = {
      extraPrice: Math.round((alternative.price - first.price) * 100) / 100,
      extraAutonomyKm: (alternative.autonomyKm ?? 0) - (first.autonomyKm ?? 0),
      extraCapacity: (alternative.capacity ?? 0) - (first.capacity ?? 0),
    };
    const gains = [
      tradeoff.extraAutonomyKm > 0 ? `+${tradeoff.extraAutonomyKm} km de autonomia declarada` : null,
      tradeoff.extraCapacity > 0 ? `+${tradeoff.extraCapacity} lugar${tradeoff.extraCapacity > 1 ? "es" : ""}` : null,
    ].filter(Boolean).join(" e ");
    const priceText = tradeoff.extraPrice > 0
      ? `R$ ${tradeoff.extraPrice.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} a mais`
      : "mesmo preço";
    bikes.push({
      ...alternative,
      role: "alternativa",
      budgetRemaining: remaining(alternative),
      tradeoff,
      reason: `Alternativa à ${first.name}: ${priceText} por ${gains}. ${buildReason(alternative, criteria)}`,
    });
  }
  return { ok: true, bikes: bikes.slice(0, MAX_QUICK_RECOMMENDATIONS), eligibleCount: byPrice.length };
}

/** Mais barata entre as que têm vantagem verificável relevante sobre a econômica; nenhuma = só uma opção. */
export function pickAlternative(first: MobilityBikeCandidate, byPrice: MobilityBikeCandidate[]): MobilityBikeCandidate | null {
  const firstKm = first.autonomyKm ?? 0;
  const firstCap = first.capacity ?? 0;
  return (
    byPrice.find(
      (b) =>
        b.bikeId !== first.bikeId &&
        (((b.autonomyKm ?? 0) >= firstKm * (1 + RELEVANT_AUTONOMY_GAIN) && (b.autonomyKm ?? 0) > firstKm) ||
          (finitePositive(b.capacity) && b.capacity > firstCap)),
    ) ?? null
  );
}

function buildReason(b: MobilityBikeCandidate, c: RecommendationCriteria): string {
  const parts = [
    `Autonomia declarada de ${b.autonomyKm} km cobre os ${c.dailyKm} km do seu dia com margem de 20%`,
  ];
  if (c.needsPassenger && finitePositive(b.capacity)) parts.push(`capacidade para ${b.capacity} pessoas`);
  if (finitePositive(c.maxBudget)) parts.push("preço dentro do orçamento informado");
  return `${parts.join("; ")}.`;
}

export const BikeRecommendationEngine = {
  recommend: recommendBikes,
  recommendQuick: recommendQuickComparison,
  orderCriterion: ORDER_CRITERION,
  quickOrderCriterion: QUICK_ORDER_CRITERION,
};
