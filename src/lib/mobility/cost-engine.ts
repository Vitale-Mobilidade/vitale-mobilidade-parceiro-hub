/**
 * MobilityCostEngine — motor determinístico de custo/economia mensal.
 * Sem IA, sem rede, sem estimativa mágica: tudo que entra no cálculo vem do usuário.
 *
 * Fórmula:
 *   diasNoMes            = diasPorSemana * (52/12)
 *   kmNoMes              = kmPorDia * diasNoMes
 *   kmSubstituidos       = kmNoMes * (percentual/100)
 *   custoAtualSubstituido= custo variável proporcional aos km substituídos
 *                          (+ custos fixos SOMENTE se o usuário deixar de manter o veículo)
 *   custoDaBike          = kmSubstituidos * energiaPorKm + manutençãoMensal (se percentual > 0)
 *   economiaMensal       = custoAtualSubstituido - custoDaBike
 *   economiaAnual        = economiaMensal * 12
 *
 * Economia <= 0 é retornada como está. Nunca há valor "padrão".
 */
import { LIMITS, QUICK_BIKE_COST, WEEKS_PER_MONTH, roundMoney } from "./config";

export type Modal = "carro" | "moto" | "uber" | "transporte_publico" | "misto";

export type VehicleInput = {
  /** Preço do combustível por litro (R$). */
  fuelPricePerLiter: number;
  /** Consumo do veículo (km por litro). */
  kmPerLiter: number;
  /** Custos variáveis extras por mês já relacionados ao trajeto (pedágio, estacionamento). */
  variableExtrasMonthly: number;
  /** Custos fixos mensais (seguro, IPVA, licenciamento, manutenção fixa). */
  fixedMonthly: number;
  /** Se true, o usuário mantém o veículo — custos fixos NÃO entram como economia. */
  keepsVehicle: boolean;
};

export type CostInput = {
  modal: Modal;
  daysPerWeek: number;
  dailyKm: number;
  replaceablePercent: number;
  /** carro | moto */
  vehicle?: VehicleInput;
  /** uber: custo médio por km rodado (R$/km). */
  ridePricePerKm?: number;
  /** transporte público: tarifa por embarque e embarques por dia. */
  transit?: { farePerTrip: number; tripsPerDay: number };
  /** misto: gasto mensal variável informado pelo usuário (R$/mês). */
  mixedMonthlySpend?: number;
  /** Bike: consumo elétrico por km (R$/km) e manutenção mensal (R$/mês), informados pelo usuário. */
  bike: { energyCostPerKm: number; maintenanceMonthly: number };
};

export type CostBreakdown = {
  monthlyDays: number;
  monthlyKm: number;
  replacedKm: number;
  currentVariableReplaced: number;
  currentFixedRemoved: number;
  currentTotalReplaced: number;
  bikeEnergyCost: number;
  bikeMaintenanceCost: number;
  bikeTotalCost: number;
  monthlySavings: number;
  annualSavings: number;
  /** true quando custos fixos existem mas foram excluídos porque o veículo será mantido. */
  fixedExcludedBecauseVehicleKept: boolean;
};

export type CostResult = { ok: true; data: CostBreakdown } | { ok: false; errors: string[] };

export type QuickCostInput = {
  modal: Modal;
  /** Gasto mensal evitável informado pelo usuário. Para carro/moto, não inclui custos fixos mantidos. */
  monthlySpend: number;
  daysPerWeek: number;
  dailyKm: number;
  replaceablePercent: number;
  /** Opcional (carro/moto): o usuário continuará com o veículo? Só false permite custo fixo evitado. */
  keepsVehicle?: boolean;
  /** Opcional: custo fixo mensal que DE FATO desaparece (digitado). Exige keepsVehicle === false. */
  fixedAvoidedMonthly?: number;
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function checkRange(
  errors: string[],
  label: string,
  value: unknown,
  range: { min: number; max: number },
): value is number {
  if (!isNum(value) || value < 0) {
    errors.push(`${label}: informe um número válido e não negativo.`);
    return false;
  }
  if (value < range.min || value > range.max) {
    errors.push(`${label}: valor fora do intervalo aceito (${range.min} a ${range.max}).`);
    return false;
  }
  return true;
}

export function computeMobilityCost(input: CostInput): CostResult {
  const errors: string[] = [];
  const okDays = checkRange(errors, "Dias por semana", input.daysPerWeek, LIMITS.daysPerWeek);
  const okKm = checkRange(errors, "Distância por dia", input.dailyKm, LIMITS.dailyKm);
  const okPct = checkRange(errors, "Percentual substituível", input.replaceablePercent, LIMITS.replaceablePercent);
  const okEnergy = checkRange(errors, "Custo de energia da bike por km", input.bike?.energyCostPerKm, LIMITS.moneyPerUnit);
  const okMaint = checkRange(errors, "Manutenção mensal da bike", input.bike?.maintenanceMonthly, LIMITS.monthlyMoney);

  const monthlyDays = okDays ? input.daysPerWeek * WEEKS_PER_MONTH : 0;
  const monthlyKm = okDays && okKm ? monthlyDays * input.dailyKm : 0;
  const share = okPct ? input.replaceablePercent / 100 : 0;
  const replacedKm = monthlyKm * share;

  let variableReplaced = 0;
  let fixedRemoved = 0;
  let fixedExcludedBecauseVehicleKept = false;

  if (input.modal === "carro" || input.modal === "moto") {
    const v = input.vehicle;
    if (!v) {
      errors.push("Dados do veículo: preencha combustível, consumo e custos.");
    } else {
      const okFuel = checkRange(errors, "Preço do combustível", v.fuelPricePerLiter, LIMITS.moneyPerUnit);
      const okCons = checkRange(errors, "Consumo (km/l)", v.kmPerLiter, LIMITS.kmPerLiter);
      const okExtra = checkRange(errors, "Pedágio e estacionamento", v.variableExtrasMonthly, LIMITS.monthlyMoney);
      const okFixed = checkRange(errors, "Custos fixos mensais", v.fixedMonthly, LIMITS.monthlyMoney);
      // Decisão sobre manter o veículo precisa ser explícita: `undefined` NUNCA vira "vendeu o veículo".
      if (typeof v.keepsVehicle !== "boolean") {
        errors.push("Manter o veículo: responda se você vai continuar com o carro/moto ou não.");
      }
      if (okFuel && okCons) variableReplaced += (v.fuelPricePerLiter / v.kmPerLiter) * replacedKm;
      if (okExtra) variableReplaced += v.variableExtrasMonthly * share;
      if (okFixed) {
        // Custo fixo só vira economia se o usuário realmente deixar de manter o veículo.
        if (!v.keepsVehicle && share > 0) fixedRemoved = v.fixedMonthly;
        else if (v.fixedMonthly > 0) fixedExcludedBecauseVehicleKept = true;
      }
    }
  } else if (input.modal === "uber") {
    if (checkRange(errors, "Custo por km do aplicativo", input.ridePricePerKm, LIMITS.moneyPerUnit)) {
      variableReplaced += (input.ridePricePerKm as number) * replacedKm;
    }
  } else if (input.modal === "transporte_publico") {
    const t = input.transit;
    if (!t) {
      errors.push("Transporte público: informe a tarifa e os embarques por dia.");
    } else {
      const okFare = checkRange(errors, "Tarifa por embarque", t.farePerTrip, LIMITS.moneyPerUnit);
      const okTrips = checkRange(errors, "Embarques por dia", t.tripsPerDay, LIMITS.tripsPerDay);
      if (okFare && okTrips) variableReplaced += t.farePerTrip * t.tripsPerDay * monthlyDays * share;
    }
  } else if (input.modal === "misto") {
    if (checkRange(errors, "Gasto mensal atual com transporte", input.mixedMonthlySpend, LIMITS.monthlyMoney)) {
      variableReplaced += (input.mixedMonthlySpend as number) * share;
    }
  } else {
    errors.push("Modal de transporte inválido.");
  }

  if (errors.length > 0) return { ok: false, errors };

  const bikeEnergyCost = okEnergy ? replacedKm * input.bike.energyCostPerKm : 0;
  // Sem substituição não há uso da bike: energia e manutenção ficam zeradas.
  const bikeMaintenanceCost = okMaint && share > 0 ? input.bike.maintenanceMonthly : 0;
  const currentTotalReplaced = variableReplaced + fixedRemoved;
  const bikeTotalCost = bikeEnergyCost + bikeMaintenanceCost;
  // Arredonda a economia mensal em centavos e deriva a anual dela, para as duas serem coerentes.
  const monthlySavings = roundMoney(currentTotalReplaced - bikeTotalCost);

  return {
    ok: true,
    data: {
      monthlyDays: roundMoney(monthlyDays),
      monthlyKm: roundMoney(monthlyKm),
      replacedKm: roundMoney(replacedKm),
      currentVariableReplaced: roundMoney(variableReplaced),
      currentFixedRemoved: roundMoney(fixedRemoved),
      currentTotalReplaced: roundMoney(currentTotalReplaced),
      bikeEnergyCost: roundMoney(bikeEnergyCost),
      bikeMaintenanceCost: roundMoney(bikeMaintenanceCost),
      bikeTotalCost: roundMoney(bikeTotalCost),
      monthlySavings,
      annualSavings: roundMoney(monthlySavings * 12),
      fixedExcludedBecauseVehicleKept,
    },
  };
}

/**
 * Modo rápido: preserva o mesmo CostBreakdown do motor detalhado, mas parte do gasto mensal
 * evitável informado pelo usuário e das premissas operacionais centrais da bike.
 */
export function computeQuickMobilityCost(input: QuickCostInput): CostResult {
  const errors: string[] = [];
  const validModal = ["carro", "moto", "uber", "transporte_publico", "misto"].includes(input.modal);
  if (!validModal) errors.push("Modal de transporte inválido.");
  const okSpend = checkRange(errors, "Gasto mensal aproximado", input.monthlySpend, LIMITS.monthlyMoney);
  const okDays = checkRange(errors, "Dias por semana", input.daysPerWeek, LIMITS.daysPerWeek);
  const okKm = checkRange(errors, "Distância por dia", input.dailyKm, LIMITS.dailyKm);
  const okPct = checkRange(errors, "Percentual substituível", input.replaceablePercent, LIMITS.replaceablePercent);
  // Custo fixo evitado: só existe se o usuário informou explicitamente keepsVehicle === false
  // E digitou o valor. Nunca estimamos fração de custo fixo.
  let fixedRemoved = 0;
  if (input.fixedAvoidedMonthly !== undefined) {
    if (input.keepsVehicle !== false) {
      errors.push("Custo fixo evitado só pode ser informado quando você não continuará com o veículo.");
    } else if (checkRange(errors, "Custo fixo mensal evitado", input.fixedAvoidedMonthly, LIMITS.monthlyMoney)) {
      fixedRemoved = input.fixedAvoidedMonthly;
    }
  }
  if (input.keepsVehicle !== undefined && typeof input.keepsVehicle !== "boolean") {
    errors.push("Informe se continuará com o veículo.");
  }
  if (errors.length > 0) return { ok: false, errors };

  const share = okPct ? input.replaceablePercent / 100 : 0;
  const monthlyDays = okDays ? input.daysPerWeek * WEEKS_PER_MONTH : 0;
  const monthlyKm = okKm ? monthlyDays * input.dailyKm : 0;
  const replacedKm = monthlyKm * share;
  const currentVariableReplaced = okSpend ? input.monthlySpend * share : 0;
  const bikeEnergyCost = replacedKm * QUICK_BIKE_COST.energyPerKm;
  const bikeMaintenanceCost = share > 0 ? QUICK_BIKE_COST.maintenanceMonthly : 0;
  const bikeTotalCost = bikeEnergyCost + bikeMaintenanceCost;
  const currentTotalReplaced = currentVariableReplaced + fixedRemoved;
  const monthlySavings = roundMoney(currentTotalReplaced - bikeTotalCost);

  return {
    ok: true,
    data: {
      monthlyDays: roundMoney(monthlyDays),
      monthlyKm: roundMoney(monthlyKm),
      replacedKm: roundMoney(replacedKm),
      currentVariableReplaced: roundMoney(currentVariableReplaced),
      currentFixedRemoved: roundMoney(fixedRemoved),
      currentTotalReplaced: roundMoney(currentTotalReplaced),
      bikeEnergyCost: roundMoney(bikeEnergyCost),
      bikeMaintenanceCost: roundMoney(bikeMaintenanceCost),
      bikeTotalCost: roundMoney(bikeTotalCost),
      monthlySavings,
      annualSavings: roundMoney(monthlySavings * 12),
      fixedExcludedBecauseVehicleKept: (input.modal === "carro" || input.modal === "moto") && fixedRemoved === 0,
    },
  };
}

/**
 * Normaliza um campo de gasto OPCIONAL (custo anual): branco = ausente (tratado como 0
 * somente quando outro campo tiver valor), sem erro. Preenchido: precisa ser número válido.
 * Nunca converte texto inválido em 0 silenciosamente.
 */
export type OptionalSpendField = { value: number; provided: boolean; error: string | null };

export function normalizeOptionalSpend(raw: string, label: string): OptionalSpendField {
  if (raw.trim() === "") return { value: 0, provided: false, error: null };
  const value = Number(raw.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) {
    return { value: 0, provided: true, error: `${label}: informe um número válido e não negativo.` };
  }
  if (value < LIMITS.monthlyMoney.min || value > LIMITS.monthlyMoney.max) {
    return { value: 0, provided: true, error: `${label}: valor fora do intervalo aceito (${LIMITS.monthlyMoney.min} a ${LIMITS.monthlyMoney.max}).` };
  }
  return { value, provided: true, error: null };
}

/**
 * Custo anual de mobilidade (visão de gasto, NÃO de economia).
 * total mensal = soma das categorias; anual = mensal × 12;
 * parcela potencialmente substituível = total × percentual (informativa, não garantida:
 * custos fixos de carro/moto mantidos continuam existindo).
 */
export type AnnualCostInput = {
  carMoto: number;
  rideHailing: number;
  publicTransport: number;
  parkingOther: number;
  replaceablePercent: number;
};

export type AnnualCategory = "carMoto" | "rideHailing" | "publicTransport" | "parkingOther";

export type AnnualCostResult =
  | {
      ok: true;
      data: {
        monthlyTotal: number;
        annualTotal: number;
        replaceableMonthly: number;
        replaceableAnnual: number;
        largestCategory: AnnualCategory | null;
      };
    }
  | { ok: false; errors: string[] };

export function computeAnnualMobilityCost(input: AnnualCostInput): AnnualCostResult {
  const errors: string[] = [];
  checkRange(errors, "Carro/moto", input.carMoto, LIMITS.monthlyMoney);
  checkRange(errors, "Uber/99", input.rideHailing, LIMITS.monthlyMoney);
  checkRange(errors, "Transporte público", input.publicTransport, LIMITS.monthlyMoney);
  checkRange(errors, "Estacionamento e outros", input.parkingOther, LIMITS.monthlyMoney);
  checkRange(errors, "Percentual substituível", input.replaceablePercent, LIMITS.replaceablePercent);
  if (errors.length > 0) return { ok: false, errors };

  const cats = {
    carMoto: input.carMoto,
    rideHailing: input.rideHailing,
    publicTransport: input.publicTransport,
    parkingOther: input.parkingOther,
  };
  const monthlyTotal = roundMoney(Object.values(cats).reduce((a, b) => a + b, 0));
  const replaceableMonthly = roundMoney(monthlyTotal * (input.replaceablePercent / 100));
  let largestCategory: AnnualCategory | null = null;
  let max = 0;
  for (const [key, value] of Object.entries(cats) as [keyof typeof cats, number][]) {
    if (value > max) { max = value; largestCategory = key; }
  }
  return {
    ok: true,
    data: {
      monthlyTotal,
      annualTotal: roundMoney(monthlyTotal * 12),
      replaceableMonthly,
      replaceableAnnual: roundMoney(replaceableMonthly * 12),
      largestCategory,
    },
  };
}

export const MobilityCostEngine = {
  compute: computeMobilityCost,
  computeQuick: computeQuickMobilityCost,
  computeAnnual: computeAnnualMobilityCost,
};
