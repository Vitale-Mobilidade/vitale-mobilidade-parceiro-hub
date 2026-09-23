import { brl } from "./format";
import { computeQuickMobilityCost, type CostResult } from "./cost-engine";

/**
 * Uber/99 vs bike: adaptador fino sobre o modo rápido do MobilityCostEngine
 * (modal "uber"). Não há fórmula própria aqui — só o gasto anual atual
 * (gasto mensal × 12) exibido como contexto.
 */
export type UberVsBikeInput = {
  monthlySpend: number;
  dailyKm: number;
  daysPerWeek: number;
  replaceablePercent: number;
};

export function computeUberVsBike(input: UberVsBikeInput): CostResult & { annualCurrentSpend?: number } {
  const result = computeQuickMobilityCost({ modal: "uber", ...input });
  if (!result.ok) return result;
  return { ...result, annualCurrentSpend: Math.round(input.monthlySpend * 12 * 100) / 100 };
}

/** Insight determinístico; nunca promete economia com resultado <= 0 ou 0%. */
export function uberVsBikeInsight(args: {
  replaceablePercent: number;
  monthlySavings: number;
  annualSavings: number;
}): string {
  if (args.replaceablePercent === 0) {
    return "Sem gasto informado nessas corridas, não há o que a bike substituir: o resultado mostra só o custo dela, e nenhuma bike é sugerida.";
  }
  if (args.monthlySavings === 0) {
    return "Com esses dados, o custo estimado da bike empata com as corridas que ela substituiria. Não há economia mensal.";
  }
  if (args.monthlySavings < 0) {
    return `Com esses dados, a bike custaria ${brl(Math.abs(args.monthlySavings), true)} a mais por mês do que as corridas substituídas. Nesse cenário o app sai mais barato.`;
  }
  return `Economia líquida estimada de ${brl(args.monthlySavings, true)} por mês (${brl(args.annualSavings)} por ano), já descontado o custo operacional da bike e antes do preço dela.`;
}
