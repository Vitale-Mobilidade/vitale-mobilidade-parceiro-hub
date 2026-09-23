/**
 * BikeRecommendationEngine — seleção determinística de bikes compatíveis com o cenário da calculadora.
 * Só trabalha com dados reais já validados pela camada de servidor (elegibilidade do Quiz +
 * oferta atômica atual do catálogo público). Não inventa score, preço, autonomia nem link.
 * Não altera nem reproduz o resultado do Quiz: aqui só há filtro verificável + ordenação explicada.
 */
import { AUTONOMY_SAFETY_MARGIN, MAX_RECOMMENDATIONS, MELI_LINK_RE } from "./config";

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
  maxBudget: number | null;
};

export type RecommendedBike = MobilityBikeCandidate & { reason: string };

export const ORDER_CRITERION =
  "Ordenamos pelo menor preço da oferta atual entre as bikes que atendem à sua distância diária (com margem de 20% sobre a autonomia declarada) e, em caso de empate, pela maior autonomia.";

const finitePositive = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export function recommendBikes(
  candidates: MobilityBikeCandidate[],
  criteria: RecommendationCriteria,
): RecommendedBike[] {
  if (!Array.isArray(candidates) || !finitePositive(criteria.dailyKm)) return [];
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

  return sorted.slice(0, MAX_RECOMMENDATIONS).map((b) => ({ ...b, reason: buildReason(b, criteria) }));
}

function buildReason(b: MobilityBikeCandidate, c: RecommendationCriteria): string {
  const parts = [
    `Autonomia declarada de ${b.autonomyKm} km cobre os ${c.dailyKm} km do seu dia com margem de 20%`,
  ];
  if (c.needsPassenger && finitePositive(b.capacity)) parts.push(`capacidade para ${b.capacity} pessoas`);
  if (finitePositive(c.maxBudget)) parts.push("preço dentro do orçamento informado");
  return `${parts.join("; ")}.`;
}

export const BikeRecommendationEngine = { recommend: recommendBikes, orderCriterion: ORDER_CRITERION };
