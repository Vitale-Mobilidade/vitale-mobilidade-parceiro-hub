import { PROJECTION_MONTHS, roundMoney } from "./config";

export type ProjectionPoint = {
  months: (typeof PROJECTION_MONTHS)[number];
  currentRouteCost: number;
  bikeCostWithPurchase: number;
  netBalance: number;
};

export type ProjectionResult =
  | { ok: true; paybackMonths: number | null; points: ProjectionPoint[] }
  | { ok: false; errors: string[] };

const finiteNonNegative = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

/** Projeção linear e determinística; não inclui financiamento, inflação, revenda ou depreciação. */
export function computeCostProjection(input: {
  monthlyCurrentCost: number;
  monthlyBikeCost: number;
  bikePrice: number;
}): ProjectionResult {
  const errors: string[] = [];
  if (!finiteNonNegative(input.monthlyCurrentCost)) errors.push("Custo mensal atual inválido.");
  if (!finiteNonNegative(input.monthlyBikeCost)) errors.push("Custo mensal da bike inválido.");
  if (!finiteNonNegative(input.bikePrice) || input.bikePrice === 0) errors.push("Preço da bike inválido.");
  if (errors.length > 0) return { ok: false, errors };

  const monthlySavings = roundMoney(input.monthlyCurrentCost - input.monthlyBikeCost);
  const paybackMonths = monthlySavings > 0 ? Math.ceil((input.bikePrice / monthlySavings) * 10) / 10 : null;
  return {
    ok: true,
    paybackMonths,
    points: PROJECTION_MONTHS.map((months) => ({
      months,
      currentRouteCost: roundMoney(input.monthlyCurrentCost * months),
      bikeCostWithPurchase: roundMoney(input.bikePrice + input.monthlyBikeCost * months),
      netBalance: roundMoney(monthlySavings * months - input.bikePrice),
    })),
  };
}

export const MobilityProjectionEngine = { compute: computeCostProjection };