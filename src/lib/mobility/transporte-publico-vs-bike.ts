import { brl, decimal } from "./format";
import { computeQuickMobilityCost, type CostBreakdown } from "./cost-engine";
import { computeMobilityTime, type TimeBreakdown } from "./time-engine";

/**
 * Transporte público vs bike: adaptador fino sobre MobilityCostEngine (modo rápido,
 * modal "transporte_publico") e MobilityTimeEngine. Os campos já descrevem SOMENTE
 * as viagens que a pessoa escolheu trocar, então o percentual interno é 100% desse
 * subconjunto — nenhum percentual é presumido.
 */
export const SUBSET_PERCENT = 100;

export type TransportePublicoInput = {
  monthlySpend: number;
  currentMinutesPerDay: number;
  bikeMinutesPerDay: number;
  daysPerWeek: number;
  dailyKm: number;
};

export type DominantBenefit = "ambos" | "dinheiro" | "tempo" | "nenhum";

export type TransportePublicoResult =
  | { ok: true; cost: CostBreakdown; time: TimeBreakdown; dominant: DominantBenefit }
  | { ok: false; errors: string[] };

export function computeTransportePublicoVsBike(input: TransportePublicoInput): TransportePublicoResult {
  const cost = computeQuickMobilityCost({
    modal: "transporte_publico",
    monthlySpend: input.monthlySpend,
    dailyKm: input.dailyKm,
    daysPerWeek: input.daysPerWeek,
    replaceablePercent: SUBSET_PERCENT,
  });
  const time = computeMobilityTime({
    currentMinutesPerDay: input.currentMinutesPerDay,
    bikeMinutesPerDay: input.bikeMinutesPerDay,
    daysPerWeek: input.daysPerWeek,
  });
  const errors = [...(cost.ok ? [] : cost.errors), ...(time.ok ? [] : time.errors)];
  if (!cost.ok || !time.ok) return { ok: false, errors };
  return { ok: true, cost: cost.data, time: time.data, dominant: dominantBenefit(cost.data.monthlySavings, time.data.savedHoursPerYear) };
}

/** Regra determinística: o benefício existe só quando o valor é > 0; nada é forçado a favor da bike. */
export function dominantBenefit(monthlySavings: number, savedHoursPerYear: number): DominantBenefit {
  const money = monthlySavings > 0;
  const time = savedHoursPerYear > 0;
  if (money && time) return "ambos";
  if (money) return "dinheiro";
  if (time) return "tempo";
  return "nenhum";
}

export const DOMINANT_LABEL: Record<DominantBenefit, string> = {
  ambos: "Dinheiro e tempo",
  dinheiro: "Dinheiro",
  tempo: "Tempo",
  nenhum: "Nenhum com esses dados",
};

export function transportePublicoInsight(r: { cost: CostBreakdown; time: TimeBreakdown; dominant: DominantBenefit }): string {
  const money = r.cost.monthlySavings;
  const hours = r.time.savedHoursPerYear;
  const moneyText = money > 0
    ? `economia líquida estimada de ${brl(money, true)}/mês`
    : money < 0
      ? `custo ${brl(Math.abs(money), true)}/mês maior que as passagens`
      : "custo mensal igual ao das passagens";
  const timeText = hours > 0
    ? `${decimal(hours)} h a menos por ano no trajeto`
    : hours < 0
      ? `${decimal(Math.abs(hours))} h a mais por ano no trajeto`
      : "o mesmo tempo no trajeto";
  switch (r.dominant) {
    case "ambos":
      return `Com esses dados, a bike traz ${moneyText} e ${timeText}.`;
    case "dinheiro":
      return `Com esses dados, o ganho da bike é financeiro (${moneyText}), mas com ${timeText}.`;
    case "tempo":
      return `Com esses dados, o ganho da bike é de tempo (${timeText}), mas com ${moneyText}. Não há retorno financeiro do investimento.`;
    default:
      return `Nos dados informados, não houve ganho com a bike: ${moneyText} e ${timeText}. Não há retorno do investimento.`;
  }
}
