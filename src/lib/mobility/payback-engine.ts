import { brl, decimal } from "./format";
import { computeQuickMobilityCost, type CostResult } from "./cost-engine";
import { computeCostProjection, type ProjectionResult } from "./projection-engine";
import type { RecommendedBike } from "./recommendation-engine";

/**
 * Payback rápido: reutiliza o modo rápido do MobilityCostEngine (sem modal —
 * o visitante informa diretamente o gasto mensal evitável, então nenhum custo
 * fixo é incluído) e o MobilityProjectionEngine por bike real.
 */
export type PaybackInput = {
  monthlySpend: number;
  dailyKm: number;
  daysPerWeek: number;
  replaceablePercent: number;
};

export function computePaybackCost(input: PaybackInput): CostResult {
  // "misto" = gasto informado já é o valor evitável; nenhum custo fixo é somado.
  return computeQuickMobilityCost({ modal: "misto", ...input });
}

export type BikePayback = { bike: RecommendedBike; projection: ProjectionResult };

export function computeBikePaybacks(
  bikes: RecommendedBike[],
  monthlyCurrentCost: number,
  monthlyBikeCost: number,
): BikePayback[] {
  return bikes.map((bike) => ({
    bike,
    projection: computeCostProjection({ monthlyCurrentCost, monthlyBikeCost, bikePrice: bike.price }),
  }));
}

/** Insight determinístico; nunca promete retorno quando economia <= 0. */
export function paybackInsight(monthlySavings: number, paybacks: BikePayback[]): string {
  if (monthlySavings <= 0) {
    return monthlySavings === 0
      ? "Com esses dados, a bike não reduz seu custo mensal. Não existe prazo de retorno do investimento."
      : `Com esses dados, a bike custaria ${brl(Math.abs(monthlySavings), true)} a mais por mês. Não existe prazo de retorno do investimento.`;
  }
  const valid = paybacks.filter((p) => p.projection.ok && p.projection.paybackMonths !== null);
  if (valid.length === 0) {
    return `Você deixaria de gastar ${brl(monthlySavings, true)} por mês. Escolha uma bike compatível para ver em quanto tempo ela se paga.`;
  }
  const fastest = valid.reduce((a, b) =>
    (a.projection.ok ? a.projection.paybackMonths! : Infinity) <= (b.projection.ok ? b.projection.paybackMonths! : Infinity) ? a : b,
  );
  const months = fastest.projection.ok ? fastest.projection.paybackMonths! : 0;
  return `Economizando ${brl(monthlySavings, true)} por mês, a ${fastest.bike.name} (${brl(fastest.bike.price)}) se paga em cerca de ${decimal(months)} meses.`;
}
