/**
 * Motores puros das sete Ferramentas de Mobilidade oficiais.
 * Sem IA, sem rede e sem persistência. Tudo que entra vem do usuário ou de TOOL_PREMISES (visíveis na página).
 * Resultados desfavoráveis (economia <= 0) são devolvidos como estão.
 */
import { LIMITS, PROJECTION_MONTHS, TOOL_LIMITS, TOOL_PREMISES, WEEKS_PER_MONTH, WEEKS_PER_YEAR, roundMoney } from "./config";
import type { ProjectionResult } from "./projection-engine";

type Range = { min: number; max: number };
export type EngineResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function check(errors: string[], label: string, value: unknown, range: Range): number {
  if (!isNum(value) || value < 0) {
    errors.push(`${label}: informe um número válido e não negativo.`);
    return 0;
  }
  if (value < range.min || value > range.max) {
    errors.push(`${label}: use um valor entre ${range.min} e ${range.max}.`);
    return 0;
  }
  return value;
}

export type BikeOperation = { energyPerKm: number; maintenanceMonthly: number };

function checkBike(errors: string[], bike: BikeOperation) {
  check(errors, "Energia da bike por km", bike?.energyPerKm, LIMITS.moneyPerUnit);
  check(errors, "Manutenção mensal da bike", bike?.maintenanceMonthly, LIMITS.monthlyMoney);
}

/** Custo mensal de operar a bike: energia por km + manutenção (zero se não há uso). */
export function bikeOperatingMonthly(kmPerMonth: number, bike: BikeOperation): number {
  if (!(kmPerMonth > 0)) return 0;
  return roundMoney(kmPerMonth * bike.energyPerKm + bike.maintenanceMonthly);
}

/**
 * Projeção com cronograma: o custo atual pode ter uma parcela que só existe nos meses restantes.
 * Preço da bike entra no mês zero. Payback = primeiro ponto (com fração de mês, 1 casa, arredondada para cima)
 * em que a economia acumulada cobre o preço. Sem economia suficiente no horizonte → null.
 */
export function computeScheduledProjection(input: {
  baseMonthly: number;
  installment?: number;
  remainingInstallments?: number;
  bikeMonthly: number;
  bikePrice: number;
}): ProjectionResult {
  const inst = input.installment ?? 0;
  const rem = input.remainingInstallments ?? 0;
  const errors: string[] = [];
  if (!isNum(input.baseMonthly) || input.baseMonthly < 0) errors.push("Custo mensal atual inválido.");
  if (!isNum(input.bikeMonthly) || input.bikeMonthly < 0) errors.push("Custo mensal da bike inválido.");
  if (!isNum(input.bikePrice) || input.bikePrice <= 0) errors.push("Preço da bike inválido.");
  if (!isNum(inst) || inst < 0 || !isNum(rem) || rem < 0) errors.push("Financiamento inválido.");
  if (errors.length) return { ok: false, errors };

  const currentAt = (m: number) => input.baseMonthly * m + inst * Math.min(m, rem);
  let paybackMonths: number | null = null;
  let cum = 0;
  for (let m = 1; m <= TOOL_PREMISES.maxPaybackMonths; m++) {
    const saving = input.baseMonthly + (m <= rem ? inst : 0) - input.bikeMonthly;
    if (saving > 0 && cum + saving >= input.bikePrice) {
      paybackMonths = Math.ceil((m - 1 + (input.bikePrice - cum) / saving) * 10) / 10;
      break;
    }
    cum += saving;
    // Depois do financiamento, se a economia deixa de ser positiva, nunca mais recupera.
    if (m >= rem && input.baseMonthly - input.bikeMonthly <= 0) break;
  }
  return {
    ok: true,
    paybackMonths,
    points: PROJECTION_MONTHS.map((months) => {
      const current = currentAt(months);
      const bike = input.bikePrice + input.bikeMonthly * months;
      return {
        months,
        currentRouteCost: roundMoney(current),
        bikeCostWithPurchase: roundMoney(bike),
        netBalance: roundMoney(current - bike),
      };
    }),
  };
}

/** Economia operacional acumulada em N meses (sem o preço da bike), respeitando o prazo das parcelas. */
export function savingsOver(months: number, s: { baseMonthly: number; installment?: number; remainingInstallments?: number; bikeMonthly: number }) {
  const inst = s.installment ?? 0;
  const rem = s.remainingInstallments ?? 0;
  return roundMoney((s.baseMonthly - s.bikeMonthly) * months + inst * Math.min(months, rem));
}

export type CostScenario = {
  /** Custo recorrente sem parcela. */
  baseMonthly: number;
  installment: number;
  remainingInstallments: number;
  /** Custo do mês atual (base + parcela se ainda houver). */
  currentMonthly: number;
  bikeMonthly: number;
  monthlySavings: number;
  nextYearSavings: number;
  threeYearSavings: number;
  kmPerMonth: number;
  /** Distância média por dia de uso, para filtrar autonomia. */
  dailyKm: number;
};

function scenario(baseMonthly: number, installment: number, remaining: number, kmPerMonth: number, dailyKm: number, bike: BikeOperation): CostScenario {
  const bikeMonthly = bikeOperatingMonthly(kmPerMonth, bike);
  const s = { baseMonthly: roundMoney(baseMonthly), installment, remainingInstallments: remaining, bikeMonthly };
  const currentMonthly = roundMoney(baseMonthly + (remaining > 0 ? installment : 0));
  return {
    ...s,
    currentMonthly,
    monthlySavings: roundMoney(currentMonthly - bikeMonthly),
    nextYearSavings: savingsOver(12, s),
    threeYearSavings: savingsOver(36, s),
    kmPerMonth: roundMoney(kmPerMonth),
    dailyKm: roundMoney(dailyKm),
  };
}

// ---------- 1 e 2. Carro / moto próprios ----------
export type OwnedVehicleInput = {
  financed: boolean;
  vehicleValue: number;
  /** Informativa: entrada já paga NÃO volta ao cálculo (custo afundado). */
  downPaymentPaid?: number;
  installment?: number;
  remainingInstallments?: number;
  kmPerMonth: number;
  kmPerLiter: number;
  fuelPrice: number;
  maintenanceMonthly: number;
  ipvaAnnual: number;
  insuranceAnnual?: number;
  otherMonthly?: number;
  opportunityRatePct: number;
  daysPerWeek: number;
  bike: BikeOperation;
};

export type OwnedVehicleBreakdown = CostScenario & {
  fuelMonthly: number;
  ipvaMonthly: number;
  insuranceMonthly: number;
  opportunityMonthly: number;
};

export function computeOwnedVehicle(i: OwnedVehicleInput): EngineResult<OwnedVehicleBreakdown> {
  const e: string[] = [];
  const value = check(e, "Valor atual do veículo", i.vehicleValue, TOOL_LIMITS.vehicleValue);
  if (i.downPaymentPaid !== undefined) check(e, "Entrada já paga", i.downPaymentPaid, TOOL_LIMITS.vehicleValue);
  let installment = 0;
  let remaining = 0;
  if (i.financed) {
    installment = check(e, "Valor da parcela", i.installment, LIMITS.monthlyMoney);
    remaining = Math.floor(check(e, "Parcelas restantes", i.remainingInstallments, TOOL_LIMITS.installments));
  }
  const km = check(e, "Km por mês", i.kmPerMonth, TOOL_LIMITS.kmPerMonth);
  const cons = check(e, "Consumo (km/l)", i.kmPerLiter, LIMITS.kmPerLiter);
  const fuel = check(e, "Preço do combustível", i.fuelPrice, LIMITS.moneyPerUnit);
  const maint = check(e, "Manutenção mensal", i.maintenanceMonthly, LIMITS.monthlyMoney);
  const ipva = check(e, "IPVA anual", i.ipvaAnnual, TOOL_LIMITS.annualMoney);
  const ins = check(e, "Seguro anual", i.insuranceAnnual ?? 0, TOOL_LIMITS.annualMoney);
  const other = check(e, "Outros custos mensais", i.otherMonthly ?? 0, LIMITS.monthlyMoney);
  const rate = check(e, "Custo de oportunidade", i.opportunityRatePct, TOOL_LIMITS.ratePct);
  const days = check(e, "Dias de uso por semana", i.daysPerWeek, LIMITS.daysPerWeek);
  checkBike(e, i.bike);
  if (e.length) return { ok: false, errors: e };

  const fuelMonthly = cons > 0 ? (km / cons) * fuel : 0;
  const ipvaMonthly = ipva / 12;
  const insuranceMonthly = ins / 12;
  const opportunityMonthly = (value * rate) / 100 / 12;
  const base = fuelMonthly + maint + ipvaMonthly + insuranceMonthly + other + opportunityMonthly;
  const dailyKm = km / (days * WEEKS_PER_MONTH);
  return {
    ok: true,
    data: {
      ...scenario(base, installment, remaining, km, dailyKm, i.bike),
      fuelMonthly: roundMoney(fuelMonthly),
      ipvaMonthly: roundMoney(ipvaMonthly),
      insuranceMonthly: roundMoney(insuranceMonthly),
      opportunityMonthly: roundMoney(opportunityMonthly),
    },
  };
}

// ---------- 3. Aplicativos ----------
export type AppsInput = { uberMonthly: number; ninetyNineMonthly: number; otherMonthly?: number; kmPerMonth: number; daysPerWeek: number; bike: BikeOperation };

export function computeApps(i: AppsInput): EngineResult<CostScenario> {
  const e: string[] = [];
  const u = check(e, "Gasto com Uber", i.uberMonthly, LIMITS.monthlyMoney);
  const n = check(e, "Gasto com 99", i.ninetyNineMonthly, LIMITS.monthlyMoney);
  const o = check(e, "Outros aplicativos", i.otherMonthly ?? 0, LIMITS.monthlyMoney);
  const km = check(e, "Km por mês", i.kmPerMonth, TOOL_LIMITS.kmPerMonth);
  const days = check(e, "Dias por semana", i.daysPerWeek, LIMITS.daysPerWeek);
  checkBike(e, i.bike);
  if (e.length) return { ok: false, errors: e };
  return { ok: true, data: scenario(u + n + o, 0, 0, km, km / (days * WEEKS_PER_MONTH), i.bike) };
}

// ---------- 4. Transporte público ----------
export type TransitInput = {
  mode: "monthly" | "daily";
  monthlyTotal?: number;
  busDaily?: number;
  metroDaily?: number;
  trainDaily?: number;
  daysPerWeek: number;
  dailyKm: number;
  bike: BikeOperation;
};

export function computeTransit(i: TransitInput): EngineResult<CostScenario & { annualCurrent: number }> {
  const e: string[] = [];
  const days = check(e, "Dias por semana", i.daysPerWeek, LIMITS.daysPerWeek);
  const dailyKm = check(e, "Distância diária", i.dailyKm, LIMITS.dailyKm);
  let monthly = 0;
  if (i.mode === "monthly") monthly = check(e, "Gasto mensal com transporte", i.monthlyTotal, LIMITS.monthlyMoney);
  else if (i.mode === "daily") {
    const perDay =
      check(e, "Ônibus por dia", i.busDaily ?? 0, TOOL_LIMITS.dailyMoney) +
      check(e, "Metrô por dia", i.metroDaily ?? 0, TOOL_LIMITS.dailyMoney) +
      check(e, "Trem por dia", i.trainDaily ?? 0, TOOL_LIMITS.dailyMoney);
    monthly = perDay * days * WEEKS_PER_MONTH;
  } else e.push("Forma de informar o gasto inválida.");
  checkBike(e, i.bike);
  if (e.length) return { ok: false, errors: e };
  const s = scenario(monthly, 0, 0, dailyKm * days * WEEKS_PER_MONTH, dailyKm, i.bike);
  return { ok: true, data: { ...s, annualCurrent: roundMoney(s.currentMonthly * 12) } };
}

// ---------- 5. Veículo alugado ----------
export type RentFrequency = "daily" | "weekly" | "monthly";
export type RentedInput = {
  vehicle: "moto" | "bicicleta";
  rentValue: number;
  frequency: RentFrequency;
  workDaysPerMonth: number;
  kmPerDay: number;
  fuelPerDay?: number;
  otherPerDay?: number;
  bike: BikeOperation;
};

export function rentMonthly(value: number, frequency: RentFrequency, workDays: number): number {
  if (frequency === "daily") return value * workDays;
  if (frequency === "weekly") return value * WEEKS_PER_MONTH;
  return value;
}

export function computeRented(i: RentedInput): EngineResult<CostScenario & { rentMonthly: number; fuelMonthly: number; otherMonthly: number }> {
  const e: string[] = [];
  if (i.vehicle !== "moto" && i.vehicle !== "bicicleta") e.push("Informe se trabalha com moto ou bicicleta alugada.");
  if (!["daily", "weekly", "monthly"].includes(i.frequency)) e.push("Frequência do aluguel inválida.");
  const rent = check(e, "Valor do aluguel", i.rentValue, LIMITS.monthlyMoney);
  const days = check(e, "Dias trabalhados por mês", i.workDaysPerMonth, TOOL_LIMITS.daysPerMonth);
  const km = check(e, "Km por dia", i.kmPerDay, LIMITS.dailyKm);
  const fuel = check(e, "Combustível por dia", i.fuelPerDay ?? 0, TOOL_LIMITS.dailyMoney);
  const other = check(e, "Outros custos por dia", i.otherPerDay ?? 0, TOOL_LIMITS.dailyMoney);
  checkBike(e, i.bike);
  if (e.length) return { ok: false, errors: e };
  const r = rentMonthly(rent, i.frequency, days);
  const s = scenario(r + (fuel + other) * days, 0, 0, km * days, km, i.bike);
  return { ok: true, data: { ...s, rentMonthly: roundMoney(r), fuelMonthly: roundMoney(fuel * days), otherMonthly: roundMoney(other * days) } };
}

// ---------- 6. Meta de entregas ----------
export type DeliveryInput = {
  dailyTarget: number;
  daysPerMonth: number;
  avgPerDelivery: number;
  promoPerDay?: number;
  kmPerDay: number;
  costsPerDay: number;
  bike: BikeOperation;
};

export type DeliveryBreakdown = {
  deliveriesPerDay: number;
  deliveriesPerMonth: number;
  revenuePerDay: number;
  revenueMonthly: number;
  costsMonthly: number;
  bikeOperationMonthly: number;
  netMonthly: number;
  netPerDay: number;
  dailyKm: number;
};

export function computeDeliveryGoal(i: DeliveryInput): EngineResult<DeliveryBreakdown> {
  const e: string[] = [];
  const target = check(e, "Meta por dia", i.dailyTarget, TOOL_LIMITS.dailyTarget);
  const days = check(e, "Dias por mês", i.daysPerMonth, TOOL_LIMITS.daysPerMonth);
  const avg = check(e, "Valor médio por entrega", i.avgPerDelivery, TOOL_LIMITS.deliveryValue);
  const promo = check(e, "Ganhos extras por dia", i.promoPerDay ?? 0, TOOL_LIMITS.dailyMoney);
  const km = check(e, "Km por dia", i.kmPerDay, LIMITS.dailyKm);
  const costs = check(e, "Custos por dia", i.costsPerDay, TOOL_LIMITS.dailyMoney);
  checkBike(e, i.bike);
  if (e.length) return { ok: false, errors: e };
  // Entregas necessárias: teto((meta − extras) ÷ valor médio). Extras que já cobrem a meta → 0 entregas.
  const deliveriesPerDay = avg > 0 ? Math.ceil(Math.max(0, target - promo) / avg - 1e-9) : 0;
  const revenuePerDay = deliveriesPerDay * avg + promo;
  const revenueMonthly = revenuePerDay * days;
  const bikeOp = bikeOperatingMonthly(km * days, i.bike);
  const costsMonthly = costs * days + bikeOp;
  const netMonthly = roundMoney(revenueMonthly - costsMonthly);
  return {
    ok: true,
    data: {
      deliveriesPerDay,
      deliveriesPerMonth: deliveriesPerDay * days,
      revenuePerDay: roundMoney(revenuePerDay),
      revenueMonthly: roundMoney(revenueMonthly),
      costsMonthly: roundMoney(costsMonthly),
      bikeOperationMonthly: bikeOp,
      netMonthly,
      netPerDay: roundMoney(netMonthly / days),
      dailyKm: km,
    },
  };
}

/** Impacto do preço real de uma bike na simulação de entregas. Sem líquido positivo → null. */
export function deliveryBikeImpact(bikePrice: number, d: Pick<DeliveryBreakdown, "netMonthly" | "netPerDay">) {
  if (!(bikePrice > 0) || !(d.netPerDay > 0) || !(d.netMonthly > 0)) return { daysEquivalent: null, paybackMonths: null };
  return {
    daysEquivalent: Math.ceil((bikePrice / d.netPerDay) * 10) / 10,
    paybackMonths: Math.ceil((bikePrice / d.netMonthly) * 10) / 10,
  };
}

// ---------- 7. Economia de tempo ----------
export type TimeSavingsInput = {
  minutesGo: number;
  minutesBack: number;
  daysPerWeek: number;
  distanceKmPerTrip: number;
  /** Opcional: minutos de bike por trecho. Vazio → distância ÷ velocidade premissa. */
  bikeMinutesPerTrip?: number | null;
  speedKmh?: number;
};

export type TimeSavingsBreakdown = {
  bikeMinutesPerTrip: number;
  bikeTimeEstimated: boolean;
  currentMinutesPerDay: number;
  bikeMinutesPerDay: number;
  savedMinutesPerDay: number;
  hoursPerWeek: number;
  hoursPerMonth: number;
  hoursPerYear: number;
  fullDaysPerYear: number;
  dailyKm: number;
};

export function estimateBikeMinutes(distanceKm: number, speedKmh: number = TOOL_PREMISES.bikeSpeedKmh): number {
  return Math.round((distanceKm / speedKmh) * 60);
}

export function computeTimeSavings(i: TimeSavingsInput): EngineResult<TimeSavingsBreakdown> {
  const e: string[] = [];
  const go = check(e, "Tempo de ida", i.minutesGo, TOOL_LIMITS.minutesPerTrip);
  const back = check(e, "Tempo de volta", i.minutesBack, TOOL_LIMITS.minutesPerTrip);
  const days = check(e, "Dias por semana", i.daysPerWeek, LIMITS.daysPerWeek);
  const dist = check(e, "Distância por trecho", i.distanceKmPerTrip, TOOL_LIMITS.distancePerTrip);
  const speed = check(e, "Velocidade média de bike", i.speedKmh ?? TOOL_PREMISES.bikeSpeedKmh, LIMITS.speedKmh);
  const informed = i.bikeMinutesPerTrip !== undefined && i.bikeMinutesPerTrip !== null;
  const bikeTrip = informed ? check(e, "Tempo de bike por trecho", i.bikeMinutesPerTrip, TOOL_LIMITS.minutesPerTrip) : 0;
  if (e.length) return { ok: false, errors: e };
  const bikeMinutesPerTrip = informed ? bikeTrip : estimateBikeMinutes(dist, speed);
  const current = go + back;
  const bikeDay = bikeMinutesPerTrip * 2;
  const saved = current - bikeDay;
  const r1 = (v: number) => Math.round(v * 10) / 10;
  const hoursPerYear = (saved * days * WEEKS_PER_YEAR) / 60;
  return {
    ok: true,
    data: {
      bikeMinutesPerTrip,
      bikeTimeEstimated: !informed,
      currentMinutesPerDay: current,
      bikeMinutesPerDay: bikeDay,
      savedMinutesPerDay: saved,
      hoursPerWeek: r1((saved * days) / 60),
      hoursPerMonth: r1((saved * days * WEEKS_PER_MONTH) / 60),
      hoursPerYear: r1(hoursPerYear),
      fullDaysPerYear: r1(hoursPerYear / 24),
      dailyKm: roundMoney(dist * 2),
    },
  };
}
