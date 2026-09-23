import { brl } from "./format";
import { computeQuickMobilityCost, type CostResult } from "./cost-engine";

/**
 * Carro vs bike: adaptador fino sobre o modo rápido do MobilityCostEngine (modal "carro").
 * Só gasto variável digitado entra; custo fixo evitado só quando o usuário diz que não
 * continuará com o carro E digita o valor (nunca estimado).
 */
export type CarroVsBikeInput = {
  monthlySpend: number;
  dailyKm: number;
  daysPerWeek: number;
  replaceablePercent: number;
  keepsVehicle: boolean;
  fixedAvoidedMonthly?: number;
};

export function computeCarroVsBike(input: CarroVsBikeInput): CostResult {
  return computeQuickMobilityCost({
    modal: "carro",
    monthlySpend: input.monthlySpend,
    dailyKm: input.dailyKm,
    daysPerWeek: input.daysPerWeek,
    replaceablePercent: input.replaceablePercent,
    keepsVehicle: input.keepsVehicle,
    fixedAvoidedMonthly: input.keepsVehicle ? undefined : input.fixedAvoidedMonthly,
  });
}

export function carroVsBikeInsight(args: {
  replaceablePercent: number;
  monthlySavings: number;
  annualSavings: number;
  keepsVehicle: boolean;
  fixedIncluded: number;
}): string {
  if (args.replaceablePercent === 0 && args.fixedIncluded === 0) {
    return "Com 0% dos trajetos substituíveis, a bike não entra na sua rotina: não há economia a estimar nem bike a sugerir.";
  }
  if (args.monthlySavings === 0) {
    return "Com esses dados, o custo operacional estimado da bike empata com o gasto evitável do carro. Não há economia mensal nem retorno do investimento.";
  }
  if (args.monthlySavings < 0) {
    return `Com esses dados, a bike custaria ${brl(Math.abs(args.monthlySavings), true)} a mais por mês do que o gasto evitável do carro. Não há retorno do investimento nesse cenário.`;
  }
  const scope = args.keepsVehicle
    ? " Como você continuará com o carro, seguro, IPVA e outros custos fixos não entram."
    : args.fixedIncluded > 0
      ? ` Inclui ${brl(args.fixedIncluded, true)}/mês de custo fixo que você informou que deixará de existir.`
      : " Só o gasto variável que você digitou entra; nenhum custo fixo foi somado.";
  return `Economia líquida estimada de ${brl(args.monthlySavings, true)} por mês (${brl(args.annualSavings)} por ano), já descontado o custo operacional da bike e antes do preço dela.${scope}`;
}
