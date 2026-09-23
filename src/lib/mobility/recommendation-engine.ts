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
  /** Leitura real do Radar, apenas quando a oferta comercial corresponde ao preço monitorado. */
  radarClassification?: "forming" | "lowest" | "good" | "typical" | "above" | null;
  /**
   * Evidência POSITIVA na fonte do Quiz: `terrains` contém "muitas_subidas" ou `bestFor` contém
   * "subidas" (arrays de strings validados). Ausente/desconhecido = false. É marcação editorial,
   * não prova de desempenho real.
   */
  hillTagged?: boolean;
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
  /** Opcional: quando true, só entram bikes com `hillTagged === true`. */
  needsHills?: boolean;
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
  "Mostramos a bike de menor preço que cobre sua distância com margem de 20%, respeita garupa, subidas e o teto informado. Quando existe outra opção com pelo menos 25% mais autonomia declarada, mostramos também essa alternativa para comparação. A seleção não é o resultado personalizado do Quiz.";

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
  if (budgetInformed && !(finitePositive(budget) && budget >= LIMITS.budget.min && budget <= LIMITS.budget.max)) {
    errors.push(
      `Orçamento máximo: informe um valor entre ${LIMITS.budget.min} e ${LIMITS.budget.max} reais, ou deixe o campo em branco para não filtrar por preço.`,
    );
  }
  if (errors.length > 0) return { ok: false, errors };

  const eligible = eligibleCandidates(candidates, criteria);

  const sorted = [...eligible].sort(
    (a, b) => a.price - b.price || (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) || a.bikeId.localeCompare(b.bikeId),
  );

  return {
    ok: true,
    bikes: sorted.slice(0, MAX_RECOMMENDATIONS).map((b) => ({ ...b, reason: buildReason(b, criteria) })),
  };
}

function eligibleCandidates(
  candidates: MobilityBikeCandidate[],
  criteria: RecommendationCriteria,
): MobilityBikeCandidate[] {
  const requiredKm = criteria.dailyKm * AUTONOMY_SAFETY_MARGIN;
  return candidates.filter((b) => {
    if (!b || typeof b.bikeId !== "string" || !b.bikeId) return false;
    if (typeof b.link !== "string" || !MELI_LINK_RE.test(b.link)) return false;
    if (!finitePositive(b.price)) return false;
    // Autonomia só conta quando é dado confiável; sem número, a bike não entra.
    if (!finitePositive(b.autonomyKm) || b.autonomyKm < requiredKm) return false;
    if (criteria.needsPassenger && !(finitePositive(b.capacity) && (b.capacity as number) >= 2)) return false;
    if (finitePositive(criteria.maxBudget) && b.price > (criteria.maxBudget as number)) return false;
    if (criteria.needsHills === true && b.hillTagged !== true) return false;
    return true;
  });
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
  const eligible = eligibleCandidates(candidates, criteria);
  const byPrice = [...eligible].sort(
    (a, b) => a.price - b.price || (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) || a.bikeId.localeCompare(b.bikeId),
  );
  const first = byPrice[0];
  if (!first) return { ok: true, bikes: [], eligibleCount: 0 };
  const budget = finitePositive(criteria.maxBudget) ? criteria.maxBudget : null;
  // Sem teto não há como saber a capacidade de gasto: só a opção econômica provisória.
  const alternative = budget === null ? null : pickAlternative(first, byPrice);
  const remaining = (b: MobilityBikeCandidate) => (budget === null ? null : Math.round((budget - b.price) * 100) / 100);
  const bikes: RecommendedBike[] = [
    {
      ...first,
      role: "economica",
      budgetRemaining: remaining(first),
      reason: `${budget === null ? "Opção econômica provisória: menor" : "Menor"} preço entre as ${byPrice.length} bike${byPrice.length > 1 ? "s" : ""} com oferta atual compatíve${byPrice.length > 1 ? "is" : "l"} com seu cenário.${budget !== null && byPrice.length === 1 ? " Só ela passou nos filtros." : ""}${budget !== null && byPrice.length > 1 && !alternative ? " Nenhuma outra dentro do teto tem pelo menos 25% mais autonomia declarada, então não mostramos segunda opção." : ""} ${buildReason(first, criteria)}`,
    },
  ];
  if (alternative) {
    const tradeoff = {
      extraPrice: Math.round((alternative.price - first.price) * 100) / 100,
      extraAutonomyKm: (alternative.autonomyKm ?? 0) - (first.autonomyKm ?? 0),
      extraCapacity: (alternative.capacity ?? 0) - (first.capacity ?? 0),
    };
    const gains = [tradeoff.extraAutonomyKm > 0 ? `+${tradeoff.extraAutonomyKm} km de autonomia declarada` : null]
      .filter(Boolean)
      .join(" e ");
    const priceText =
      tradeoff.extraPrice > 0
        ? `R$ ${tradeoff.extraPrice.toLocaleString("pt-BR", { maximumFractionDigits: 0 })} a mais`
        : "mesmo preço";
    bikes.push({
      ...alternative,
      role: "alternativa",
      budgetRemaining: remaining(alternative),
      tradeoff,
      reason: `Alternativa à ${first.name}: ${priceText} por ${gains}${tradeoff.extraAutonomyKm < 0 ? `` : ""}. ${buildReason(alternative, criteria)}`,
    });
  }
  return { ok: true, bikes: bikes.slice(0, MAX_QUICK_RECOMMENDATIONS), eligibleCount: byPrice.length };
}

/** Piloto de tempo: duas opções reais, sem orçamento obrigatório nem vantagem artificial de 25%. */
export function recommendScenarioPair(
  candidates: MobilityBikeCandidate[],
  criteria: RecommendationCriteria,
): RecommendationResult {
  const checked = recommendBikes(candidates, criteria);
  if (!checked.ok) return checked;
  const sorted = eligibleCandidates(candidates, criteria).sort(
    (a, b) => a.price - b.price || (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) || a.bikeId.localeCompare(b.bikeId),
  );
  const first = sorted[0];
  if (!first) return { ok: true, bikes: [], eligibleCount: 0 };
  const second = sorted
    .slice(1)
    .filter((bike) => (bike.autonomyKm ?? 0) >= (first.autonomyKm ?? 0) * (1 + RELEVANT_AUTONOMY_GAIN))
    .sort(
      (a, b) => (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) || a.price - b.price || a.bikeId.localeCompare(b.bikeId),
    )[0];
  const bikes: RecommendedBike[] = [{ ...first, role: "economica", reason: buildReason(first, criteria) }];
  if (second)
    bikes.push({
      ...second,
      role: "alternativa",
      tradeoff: {
        extraPrice: Math.round((second.price - first.price) * 100) / 100,
        extraAutonomyKm: (second.autonomyKm ?? 0) - (first.autonomyKm ?? 0),
        extraCapacity: (second.capacity ?? 0) - (first.capacity ?? 0),
      },
      reason: buildReason(second, criteria),
    });
  return { ok: true, bikes, eligibleCount: sorted.length };
}

/**
 * Alternativa só com vantagem que responde a uma necessidade expressa: autonomia declarada
 * ≥ 25% maior que a da econômica (capacidade extra não conta; garupa já é filtro rígido).
 * Entre as que qualificam: MAIOR autonomia; empate → menor preço; depois bikeId. Nenhuma = só uma.
 * `byPrice` já vem filtrado (teto, garupa, subidas), então a alternativa satisfaz os mesmos filtros.
 */
export function pickAlternative(
  first: MobilityBikeCandidate,
  byPrice: MobilityBikeCandidate[],
): MobilityBikeCandidate | null {
  const firstKm = first.autonomyKm ?? 0;
  const qualified = byPrice.filter(
    (b) =>
      b.bikeId !== first.bikeId &&
      finitePositive(b.autonomyKm) &&
      b.autonomyKm > firstKm &&
      b.autonomyKm >= firstKm * (1 + RELEVANT_AUTONOMY_GAIN),
  );
  qualified.sort(
    (a, b) => (b.autonomyKm ?? 0) - (a.autonomyKm ?? 0) || a.price - b.price || a.bikeId.localeCompare(b.bikeId),
  );
  return qualified[0] ?? null;
}

function buildReason(b: MobilityBikeCandidate, c: RecommendationCriteria): string {
  const parts = [`Autonomia declarada de ${b.autonomyKm} km cobre os ${c.dailyKm} km do seu dia com margem de 20%`];
  if (c.needsPassenger && finitePositive(b.capacity)) parts.push(`capacidade para ${b.capacity} pessoas`);
  if (c.needsHills === true && b.hillTagged === true)
    parts.push("marcada no catálogo do Quiz como indicada para trajetos com subidas");
  if (finitePositive(c.maxBudget)) parts.push("preço dentro do orçamento informado");
  return `${parts.join("; ")}.`;
}

export const BikeRecommendationEngine = {
  recommend: recommendBikes,
  recommendQuick: recommendQuickComparison,
  orderCriterion: ORDER_CRITERION,
  quickOrderCriterion: QUICK_ORDER_CRITERION,
};
