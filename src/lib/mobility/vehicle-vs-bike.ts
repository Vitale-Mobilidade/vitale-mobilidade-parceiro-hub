import { brl } from "./format";
import { computeQuickMobilityCost, type CostResult } from "./cost-engine";

/**
 * Veículo (carro/moto) vs bike: adaptador fino sobre o modo rápido do MobilityCostEngine.
 * Só gasto variável digitado entra; custo fixo evitado só quando o usuário diz que não
 * continuará com ${noun} E digita o valor (nunca estimado).
 */
export type Vehicle = "carro" | "moto";

export type VehicleVsBikeInput = {
  vehicle: Vehicle;
  monthlySpend: number;
  dailyKm: number;
  daysPerWeek: number;
  replaceablePercent: number;
  keepsVehicle: boolean;
  fixedAvoidedMonthly?: number;
};

export function computeVehicleVsBike(input: VehicleVsBikeInput): CostResult {
  return computeQuickMobilityCost({
    modal: input.vehicle,
    monthlySpend: input.monthlySpend,
    dailyKm: input.dailyKm,
    daysPerWeek: input.daysPerWeek,
    replaceablePercent: input.replaceablePercent,
    keepsVehicle: input.keepsVehicle,
    fixedAvoidedMonthly: input.keepsVehicle ? undefined : input.fixedAvoidedMonthly,
  });
}

export function vehicleVsBikeInsight(args: {
  vehicle: Vehicle;
  replaceablePercent: number;
  monthlySavings: number;
  annualSavings: number;
  keepsVehicle: boolean;
  fixedIncluded: number;
}): string {
  const noun = args.vehicle === "carro" ? "o carro" : "a moto";
  if (args.replaceablePercent === 0 && args.fixedIncluded === 0) {
    return "Com 0% dos trajetos substituíveis, a bike não entra na sua rotina: não há economia a estimar nem bike a sugerir.";
  }
  if (args.monthlySavings === 0) {
    return `Com esses dados, o custo operacional estimado da bike empata com o gasto evitável d${noun.slice(0,1) === "o" ? "o carro" : "a moto"}. Não há economia mensal nem retorno do investimento.`;
  }
  if (args.monthlySavings < 0) {
    return `Com esses dados, a bike custaria ${brl(Math.abs(args.monthlySavings), true)} a mais por mês do que o gasto evitável d${args.vehicle === "carro" ? "o carro" : "a moto"}. Não há retorno do investimento nesse cenário.`;
  }
  const scope = args.keepsVehicle
    ? ` Como você continuará com ${noun}, seguro, IPVA e outros custos fixos não entram.`
    : args.fixedIncluded > 0
      ? ` Inclui ${brl(args.fixedIncluded, true)}/mês de custo fixo que você informou que deixará de existir.`
      : " Só o gasto variável que você digitou entra; nenhum custo fixo foi somado.";
  return `Economia líquida estimada de ${brl(args.monthlySavings, true)} por mês (${brl(args.annualSavings)} por ano), já descontado o custo operacional da bike e antes do preço dela.${scope}`;
}

/** Compatibilidade: API aprovada do Carro permanece idêntica. */
export type CarroVsBikeInput = Omit<VehicleVsBikeInput, "vehicle">;
export const computeCarroVsBike = (input: CarroVsBikeInput) => computeVehicleVsBike({ ...input, vehicle: "carro" });
export const carroVsBikeInsight = (args: Omit<Parameters<typeof vehicleVsBikeInsight>[0], "vehicle">) =>
  vehicleVsBikeInsight({ ...args, vehicle: "carro" });
