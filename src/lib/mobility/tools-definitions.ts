/**
 * Definição declarativa dos formulários das sete ferramentas e adaptadores finos para os motores puros.
 * Nenhuma fórmula aqui: só leitura de campos, chamada ao motor e textos de saída determinísticos.
 */
import { LIMITS, TOOL_LIMITS, TOOL_PREMISES } from "./config";
import { brl, decimal } from "./format";
import {
  computeApps,
  computeDeliveryGoal,
  computeOwnedVehicle,
  computeRented,
  computeScheduledProjection,
  computeTimeSavings,
  computeTransit,
  deliveryBikeImpact,
  type CostScenario,
  type EngineResult,
} from "./tools-engine";
import type { ToolSlug } from "./tools-registry";

type Range = { min: number; max: number };
export type Section = 1 | 2 | 3;
export type Choices = Record<string, string>;
export type Values = Record<string, number | undefined>;

export type FieldDef = {
  name: string;
  label: string;
  suffix: string;
  range: Range;
  section: Section;
  optional?: boolean;
  help?: string;
  step?: string;
  /** Premissa ajustável: começa preenchida e é exibida como tal. */
  defaultValue?: string;
  visible?: (c: Choices) => boolean;
};

export type ChoiceDef = {
  name: string;
  label: string;
  section: Section;
  options: { value: string; label: string }[];
  defaultValue: string;
};

export type ImpactLine = { label: string; value: string };
export type ToolOutput = {
  hero: { eyebrow: string; value: string; conclusion: string; favorable: boolean };
  metrics: { label: string; value: string; emphasis?: boolean }[];
  /** Distância diária usada no filtro de autonomia (0 = sem recomendação). */
  dailyKm: number;
  bikeImpact: (price: number) => ImpactLine[];
  note?: string;
};

export type ToolDefinition = {
  slug: ToolSlug;
  sectionTitles: Record<Section, string>;
  choices: ChoiceDef[];
  fields: FieldDef[];
  /** Se false, sem orçamento (ex.: tempo). */
  usesBudget: boolean;
  method: string[];
  compute: (v: Values, c: Choices) => EngineResult<ToolOutput>;
};

const SECTIONS: Record<Section, string> = {
  1: "1. Seu cenário atual",
  2: "2. Sua rotina",
  3: "3. Comparação com a bike",
};

const bikePremiseFields: FieldDef[] = [
  {
    name: "energyPerKm",
    label: "Energia da bike por km",
    suffix: "R$/km",
    range: LIMITS.moneyPerUnit,
    section: 3,
    defaultValue: String(TOOL_PREMISES.energyPerKm),
    help: "Premissa da Vitale para recarga. Ajuste se souber a sua tarifa.",
  },
  {
    name: "bikeMaintenance",
    label: "Manutenção da bike por mês",
    suffix: "R$/mês",
    range: LIMITS.monthlyMoney,
    section: 3,
    defaultValue: String(TOOL_PREMISES.maintenanceMonthly),
    help: "Premissa média de manutenção. Ajuste para o seu caso.",
    step: "1",
  },
];

const bikeOp = (v: Values) => ({ energyPerKm: v.energyPerKm as number, maintenanceMonthly: v.bikeMaintenance as number });

const commonMethod = [
  `Operação da bike = km do mês × energia por km (premissa ${brl(TOOL_PREMISES.energyPerKm, true)}/km) + manutenção mensal (premissa ${brl(TOOL_PREMISES.maintenanceMonthly)}). As duas premissas podem ser ajustadas.`,
  "Mês = 52 semanas ÷ 12. O preço da bike é o da oferta atual registrada pela Vitale e entra no mês zero das projeções.",
  "Não consideramos inflação, revenda, depreciação, financiamento da bike nem variação de preço futura.",
  "Bikes sugeridas: elegíveis no catálogo do Quiz, com oferta atual, preço positivo e autonomia declarada que cobre a sua distância diária com 20% de margem. No máximo duas, sem ranking de “melhor bike”.",
];

function savingsHero(monthlySavings: number, subject: string): ToolOutput["hero"] {
  if (monthlySavings > 0)
    return {
      eyebrow: "Economia mensal estimada",
      value: brl(monthlySavings),
      conclusion: `Na simulação, trocar ${subject} pela bike reduz seu custo em ${brl(monthlySavings, true)} por mês, já descontada a operação da bike e antes do preço dela.`,
      favorable: true,
    };
  return {
    eyebrow: "Sem economia neste cenário",
    value: brl(monthlySavings),
    conclusion:
      monthlySavings === 0
        ? `Com esses dados, a bike custa o mesmo que ${subject}. Não há economia mensal nem prazo de retorno.`
        : `Com esses dados, a bike custaria ${brl(Math.abs(monthlySavings), true)} a mais por mês do que ${subject}. Não há prazo de retorno.`,
    favorable: false,
  };
}

function paybackLines(s: CostScenario, price: number, afterPayback = false): ImpactLine[] {
  const p = computeScheduledProjection({
    baseMonthly: s.baseMonthly,
    installment: s.installment,
    remainingInstallments: s.remainingInstallments,
    bikeMonthly: s.bikeMonthly,
    bikePrice: price,
  });
  if (!p.ok) return [];
  const lines: ImpactLine[] = [
    {
      label: "Payback",
      value: p.paybackMonths === null ? "Não se paga neste cenário" : `${decimal(p.paybackMonths)} meses`,
    },
    ...p.points
      .filter((pt) => pt.months !== 24)
      .map((pt) => ({ label: `Saldo em ${pt.months} meses`, value: brl(pt.netBalance) })),
  ];
  if (afterPayback && p.paybackMonths !== null)
    lines.push({ label: "Depois de pago", value: `${brl(s.baseMonthly - s.bikeMonthly)}/mês` });
  return lines;
}

function costMetrics(s: CostScenario, currentLabel: string): ToolOutput["metrics"] {
  return [
    { label: currentLabel, value: brl(s.currentMonthly) },
    { label: "Operação da bike por mês", value: brl(s.bikeMonthly) },
    { label: "Economia nos próximos 12 meses", value: brl(s.nextYearSavings) },
    { label: "Economia em 3 anos", value: brl(s.threeYearSavings) },
  ];
}

function ownedVehicle(slug: "carro-vs-bike" | "moto-vs-bike", noun: "carro" | "moto"): ToolDefinition {
  const art = noun === "carro" ? "o carro" : "a moto";
  const Noun = noun === "carro" ? "Carro" : "Moto";
  const financed = (c: Choices) => c.financed === "sim";
  return {
    slug,
    sectionTitles: SECTIONS,
    usesBudget: true,
    choices: [
      {
        name: "financed",
        label: `${Noun} quitad${noun === "carro" ? "o" : "a"} ou financiad${noun === "carro" ? "o" : "a"}?`,
        section: 1,
        defaultValue: "nao",
        options: [
          { value: "nao", label: "Quitad" + (noun === "carro" ? "o" : "a") },
          { value: "sim", label: "Financiad" + (noun === "carro" ? "o" : "a") },
        ],
      },
    ],
    fields: [
      { name: "vehicleValue", label: `Valor atual ${noun === "carro" ? "do carro" : "da moto"}`, suffix: "R$", range: TOOL_LIMITS.vehicleValue, section: 1, step: "100", help: "Valor de mercado hoje. Usado só no custo de oportunidade." },
      { name: "downPayment", label: "Entrada já paga", suffix: "R$", range: TOOL_LIMITS.vehicleValue, section: 1, optional: true, step: "100", visible: financed, help: "Informativo: o que já foi pago não volta para a conta." },
      { name: "installment", label: "Valor da parcela", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1, visible: financed },
      { name: "remaining", label: "Parcelas restantes", suffix: "meses", range: TOOL_LIMITS.installments, section: 1, step: "1", visible: financed, help: "A parcela só entra na projeção durante esses meses." },
      { name: "maintenance", label: "Manutenção", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1 },
      { name: "ipva", label: "IPVA", suffix: "R$/ano", range: TOOL_LIMITS.annualMoney, section: 1, help: "Informe 0 se for isento." },
      { name: "insurance", label: "Seguro", suffix: "R$/ano", range: TOOL_LIMITS.annualMoney, section: 1, optional: true },
      { name: "other", label: "Outros custos recorrentes", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1, optional: true, help: "Estacionamento, pedágio, licenciamento diluído." },
      { name: "kmPerMonth", label: "Quilometragem por mês", suffix: "km", range: TOOL_LIMITS.kmPerMonth, section: 2, step: "1" },
      { name: "kmPerLiter", label: "Consumo médio", suffix: "km/l", range: LIMITS.kmPerLiter, section: 2, step: "0.1" },
      { name: "fuelPrice", label: "Preço do combustível", suffix: "R$/l", range: LIMITS.moneyPerUnit, section: 2 },
      { name: "daysPerWeek", label: "Dias de uso por semana", suffix: "dias", range: LIMITS.daysPerWeek, section: 2, step: "1", defaultValue: "5", help: "Serve para estimar a distância por dia e filtrar a autonomia das bikes." },
      { name: "opportunityRate", label: "Custo de oportunidade", suffix: "% a.a.", range: TOOL_LIMITS.ratePct, section: 3, step: "0.5", defaultValue: String(TOOL_PREMISES.opportunityRateAnnualPct), help: `Rendimento que o valor ${noun === "carro" ? "do carro" : "da moto"} teria aplicado. Premissa ajustável; use 0 para desconsiderar.` },
      ...bikePremiseFields,
    ],
    method: [
      `Custo mensal ${noun === "carro" ? "do carro" : "da moto"} = combustível (km ÷ consumo × preço) + manutenção + IPVA ÷ 12 + seguro ÷ 12 + outros + custo de oportunidade (valor atual × taxa anual ÷ 12) + parcela, apenas enquanto houver parcelas restantes.`,
      "A entrada já paga não é somada de novo: é um custo que já aconteceu.",
      `A simulação supõe que a bike substitui ${art} nesses km. Se você continuar com ${art}, IPVA, seguro e parcela seguem existindo e a economia real é menor.`,
      ...commonMethod,
    ],
    compute: (v, c) => {
      const r = computeOwnedVehicle({
        financed: financed(c),
        vehicleValue: v.vehicleValue as number,
        downPaymentPaid: v.downPayment,
        installment: v.installment,
        remainingInstallments: v.remaining,
        kmPerMonth: v.kmPerMonth as number,
        kmPerLiter: v.kmPerLiter as number,
        fuelPrice: v.fuelPrice as number,
        maintenanceMonthly: v.maintenance as number,
        ipvaAnnual: v.ipva as number,
        insuranceAnnual: v.insurance,
        otherMonthly: v.other,
        opportunityRatePct: v.opportunityRate as number,
        daysPerWeek: v.daysPerWeek as number,
        bike: bikeOp(v),
      });
      if (!r.ok) return r;
      const d = r.data;
      return {
        ok: true,
        data: {
          hero: savingsHero(d.monthlySavings, art),
          metrics: costMetrics(d, `Custo mensal atual ${noun === "carro" ? "do carro" : "da moto"}`),
          dailyKm: d.dailyKm,
          bikeImpact: (price) => paybackLines(d, price),
          note:
            d.remainingInstallments > 0 && d.installment > 0
              ? `Inclui parcela de ${brl(d.installment)} por mais ${d.remainingInstallments} ${d.remainingInstallments === 1 ? "mês" : "meses"}; depois disso, o custo mensal cai para ${brl(d.baseMonthly)}.`
              : `Custo de oportunidade considerado: ${brl(d.opportunityMonthly)} por mês.`,
        },
      };
    },
  };
}

const apps: ToolDefinition = {
  slug: "aplicativos-vs-bike",
  sectionTitles: SECTIONS,
  usesBudget: true,
  choices: [],
  fields: [
    { name: "uber", label: "Gasto mensal com Uber", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1, help: "Só nas corridas que você faria de bike. Informe 0 se não usa." },
    { name: "ninetyNine", label: "Gasto mensal com 99", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1, help: "Informe 0 se não usa." },
    { name: "otherApps", label: "Outros aplicativos", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1, optional: true },
    { name: "kmPerMonth", label: "Quilometragem aproximada por mês", suffix: "km", range: TOOL_LIMITS.kmPerMonth, section: 2, step: "1", help: "Soma dessas corridas no mês." },
    { name: "daysPerWeek", label: "Dias por semana que usa aplicativo", suffix: "dias", range: LIMITS.daysPerWeek, section: 2, step: "1" },
    ...bikePremiseFields,
  ],
  method: ["Gasto atual = Uber + 99 + outros aplicativos, só nas corridas que a bike substituiria.", ...commonMethod],
  compute: (v) => {
    const r = computeApps({ uberMonthly: v.uber as number, ninetyNineMonthly: v.ninetyNine as number, otherMonthly: v.otherApps, kmPerMonth: v.kmPerMonth as number, daysPerWeek: v.daysPerWeek as number, bike: bikeOp(v) });
    if (!r.ok) return r;
    const d = r.data;
    return {
      ok: true,
      data: {
        hero: savingsHero(d.monthlySavings, "as corridas por aplicativo"),
        metrics: [
          { label: "Gasto atual com apps", value: brl(d.currentMonthly) },
          { label: "Operação da bike por mês", value: brl(d.bikeMonthly) },
          { label: "Economia anual", value: brl(d.nextYearSavings) },
          { label: "Distância média por dia", value: `${decimal(d.dailyKm)} km` },
        ],
        dailyKm: d.dailyKm,
        bikeImpact: (price) => paybackLines(d, price),
      },
    };
  },
};

const transit: ToolDefinition = {
  slug: "transporte-publico-vs-bike",
  sectionTitles: SECTIONS,
  usesBudget: true,
  choices: [
    {
      name: "mode",
      label: "Como prefere informar o gasto?",
      section: 1,
      defaultValue: "monthly",
      options: [
        { value: "monthly", label: "Total do mês" },
        { value: "daily", label: "Por dia, por modal" },
      ],
    },
  ],
  fields: [
    { name: "monthlyTotal", label: "Gasto mensal com transporte público", suffix: "R$/mês", range: LIMITS.monthlyMoney, section: 1, visible: (c) => c.mode === "monthly", help: "Só nas viagens que você faria de bike." },
    { name: "bus", label: "Ônibus por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 1, optional: true, visible: (c) => c.mode === "daily" },
    { name: "metro", label: "Metrô por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 1, optional: true, visible: (c) => c.mode === "daily" },
    { name: "train", label: "Trem por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 1, optional: true, visible: (c) => c.mode === "daily" },
    { name: "daysPerWeek", label: "Dias por semana que faz o trajeto", suffix: "dias", range: LIMITS.daysPerWeek, section: 2, step: "1" },
    { name: "dailyKm", label: "Distância diária aproximada (ida e volta)", suffix: "km", range: LIMITS.dailyKm, section: 2, step: "0.5" },
    ...bikePremiseFields,
  ],
  method: [
    "Gasto mensal = total informado, ou (ônibus + metrô + trem por dia) × dias por semana × 52 ÷ 12. Gasto anual = mensal × 12.",
    "Economia depois do payback = gasto mensal atual − operação da bike, a partir do mês em que a bike se paga.",
    "Para uso diário, damos peso à autonomia: a alternativa só aparece com pelo menos 25% mais autonomia declarada.",
    ...commonMethod,
  ],
  compute: (v, c) => {
    const r = computeTransit({ mode: c.mode === "daily" ? "daily" : "monthly", monthlyTotal: v.monthlyTotal, busDaily: v.bus, metroDaily: v.metro, trainDaily: v.train, daysPerWeek: v.daysPerWeek as number, dailyKm: v.dailyKm as number, bike: bikeOp(v) });
    if (!r.ok) return r;
    const d = r.data;
    return {
      ok: true,
      data: {
        hero: savingsHero(d.monthlySavings, "as passagens"),
        metrics: [
          { label: "Gasto mensal atual", value: brl(d.currentMonthly) },
          { label: "Gasto anual atual", value: brl(d.annualCurrent) },
          { label: "Operação da bike por mês", value: brl(d.bikeMonthly) },
          { label: "Economia anual", value: brl(d.nextYearSavings) },
        ],
        dailyKm: d.dailyKm,
        bikeImpact: (price) => paybackLines(d, price, true),
      },
    };
  },
};

const rented: ToolDefinition = {
  slug: "veiculo-alugado-vs-bike-propria",
  sectionTitles: SECTIONS,
  usesBudget: true,
  choices: [
    { name: "vehicle", label: "Hoje você trabalha com o quê?", section: 1, defaultValue: "moto", options: [{ value: "moto", label: "Moto alugada" }, { value: "bicicleta", label: "Bicicleta alugada" }] },
    { name: "frequency", label: "Como o aluguel é cobrado?", section: 1, defaultValue: "weekly", options: [{ value: "daily", label: "Por dia" }, { value: "weekly", label: "Por semana" }, { value: "monthly", label: "Por mês" }] },
  ],
  fields: [
    { name: "rent", label: "Valor do aluguel", suffix: "R$", range: LIMITS.monthlyMoney, section: 1, help: "Valor cobrado na frequência escolhida acima." },
    { name: "fuel", label: "Combustível por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 1, optional: true, visible: (c) => c.vehicle === "moto" },
    { name: "otherDaily", label: "Outros custos do veículo por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 1, optional: true, help: "Custos que deixariam de existir com a bike própria." },
    { name: "workDays", label: "Dias trabalhados por mês", suffix: "dias", range: TOOL_LIMITS.daysPerMonth, section: 2, step: "1" },
    { name: "kmPerDay", label: "Km rodados por dia", suffix: "km", range: LIMITS.dailyKm, section: 2, step: "1" },
    ...bikePremiseFields,
  ],
  method: [
    "Custo atual para trabalhar = aluguel no mês (diário × dias trabalhados, semanal × 52 ÷ 12, ou mensal) + (combustível + outros por dia) × dias trabalhados.",
    "Custo com bike própria = energia × km do mês + manutenção. O preço da bike entra à vista no mês zero; não simulamos parcelamento.",
    ...commonMethod,
  ],
  compute: (v, c) => {
    const r = computeRented({ vehicle: c.vehicle === "bicicleta" ? "bicicleta" : "moto", rentValue: v.rent as number, frequency: (c.frequency as "daily" | "weekly" | "monthly") ?? "weekly", workDaysPerMonth: v.workDays as number, kmPerDay: v.kmPerDay as number, fuelPerDay: c.vehicle === "moto" ? v.fuel : 0, otherPerDay: v.otherDaily, bike: bikeOp(v) });
    if (!r.ok) return r;
    const d = r.data;
    const hero = savingsHero(d.monthlySavings, c.vehicle === "bicicleta" ? "a bicicleta alugada" : "a moto alugada");
    if (d.monthlySavings > 0) hero.eyebrow = "Redução do custo operacional";
    return {
      ok: true,
      data: {
        hero,
        metrics: [
          { label: "Custo hoje para trabalhar", value: brl(d.currentMonthly) },
          { label: "Custo com bike própria", value: brl(d.bikeMonthly) },
          { label: "Economia anual", value: brl(d.nextYearSavings) },
          { label: "Aluguel no mês", value: brl(d.rentMonthly) },
        ],
        dailyKm: d.dailyKm,
        bikeImpact: (price) => paybackLines(d, price),
      },
    };
  },
};

const delivery: ToolDefinition = {
  slug: "meta-entregas",
  sectionTitles: { 1: "1. Sua meta", 2: "2. Sua rotina", 3: "3. Operação com a bike" },
  usesBudget: true,
  choices: [],
  fields: [
    { name: "target", label: "Quanto quer ganhar por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyTarget, section: 1 },
    { name: "avg", label: "Valor médio por entrega", suffix: "R$", range: TOOL_LIMITS.deliveryValue, section: 1 },
    { name: "promo", label: "Ganhos extras com promoções", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 1, optional: true },
    { name: "days", label: "Dias de trabalho por mês", suffix: "dias", range: TOOL_LIMITS.daysPerMonth, section: 2, step: "1" },
    { name: "kmPerDay", label: "Km que pretende rodar por dia", suffix: "km", range: LIMITS.dailyKm, section: 2, step: "1" },
    { name: "costs", label: "Custos estimados por dia", suffix: "R$/dia", range: TOOL_LIMITS.dailyMoney, section: 2, help: "Alimentação, internet, taxas. Informe 0 se não tiver." },
    ...bikePremiseFields,
  ],
  method: [
    "Entregas por dia = teto((meta diária − ganhos extras) ÷ valor médio por entrega). Entregas no mês = entregas por dia × dias.",
    "Receita projetada = (entregas × valor médio + extras) × dias. Custos = custos diários × dias + operação da bike.",
    "Dias equivalentes ao preço da bike = preço ÷ resultado líquido por dia. Payback = preço ÷ resultado líquido mensal.",
    "É uma simulação a partir dos seus números. Não é promessa de renda: demanda, valores por entrega e taxas mudam.",
    ...commonMethod,
  ],
  compute: (v) => {
    const r = computeDeliveryGoal({ dailyTarget: v.target as number, daysPerMonth: v.days as number, avgPerDelivery: v.avg as number, promoPerDay: v.promo, kmPerDay: v.kmPerDay as number, costsPerDay: v.costs as number, bike: bikeOp(v) });
    if (!r.ok) return r;
    const d = r.data;
    return {
      ok: true,
      data: {
        hero: {
          eyebrow: "Simulação da sua meta",
          value: `${d.deliveriesPerDay} entregas/dia`,
          conclusion: `Para atingir ${brl(v.target as number)} por dia, com média de ${brl(v.avg as number, true)} por entrega${v.promo ? ` e ${brl(v.promo, true)} de extras` : ""}, a simulação indica aproximadamente ${d.deliveriesPerDay} entregas. Resultado líquido estimado: ${brl(d.netMonthly)} no mês.`,
          favorable: d.netMonthly > 0,
        },
        metrics: [
          { label: "Entregas no mês", value: String(d.deliveriesPerMonth) },
          { label: "Receita mensal projetada", value: brl(d.revenueMonthly) },
          { label: "Custo mensal (inclui a bike)", value: brl(d.costsMonthly) },
          { label: "Resultado líquido simulado", value: brl(d.netMonthly), emphasis: true },
        ],
        dailyKm: d.dailyKm,
        bikeImpact: (price) => {
          const i = deliveryBikeImpact(price, d);
          return [
            { label: "Dias de trabalho equivalentes", value: i.daysEquivalent === null ? "Sem resultado líquido positivo" : `${decimal(i.daysEquivalent)} dias` },
            { label: "Payback", value: i.paybackMonths === null ? "Não se paga neste cenário" : `${decimal(i.paybackMonths)} meses` },
          ];
        },
        note: d.netMonthly <= 0 ? "Com esses números, os custos superam a receita simulada. Revise meta, valor por entrega ou custos." : undefined,
      },
    };
  },
};

const time: ToolDefinition = {
  slug: "economia-de-tempo",
  sectionTitles: { 1: "1. Seu trajeto hoje", 2: "2. Sua rotina", 3: "3. Tempo de bike" },
  usesBudget: false,
  choices: [],
  fields: [
    { name: "go", label: "Tempo para ir", suffix: "min", range: TOOL_LIMITS.minutesPerTrip, section: 1, step: "1" },
    { name: "back", label: "Tempo para voltar", suffix: "min", range: TOOL_LIMITS.minutesPerTrip, section: 1, step: "1" },
    { name: "daysPerWeek", label: "Dias por semana", suffix: "dias", range: LIMITS.daysPerWeek, section: 2, step: "1" },
    { name: "distance", label: "Distância até o destino (um trecho)", suffix: "km", range: TOOL_LIMITS.distancePerTrip, section: 2, step: "0.5" },
    { name: "bikeMinutes", label: "Tempo estimado de bike por trecho", suffix: "min", range: TOOL_LIMITS.minutesPerTrip, section: 3, optional: true, step: "1", help: "Deixe vazio para estimar pela distância." },
    { name: "speed", label: "Velocidade média da estimativa", suffix: "km/h", range: LIMITS.speedKmh, section: 3, step: "1", defaultValue: String(TOOL_PREMISES.bikeSpeedKmh), help: "Premissa usada só quando o tempo de bike está vazio." },
  ],
  method: [
    "Tempo atual por dia = ida + volta. Tempo de bike por dia = 2 × tempo por trecho.",
    `Sem tempo de bike informado, estimamos: distância ÷ velocidade média (premissa ${TOOL_PREMISES.bikeSpeedKmh} km/h), arredondado ao minuto.`,
    "Semana = economia diária × dias. Mês = semana × 52 ÷ 12. Ano = semana × 52. Dias completos = horas no ano ÷ 24.",
    "Não convertemos tempo em dinheiro. Bikes sugeridas cobrem ida e volta com 20% de margem sobre a autonomia declarada.",
  ],
  compute: (v) => {
    const r = computeTimeSavings({ minutesGo: v.go as number, minutesBack: v.back as number, daysPerWeek: v.daysPerWeek as number, distanceKmPerTrip: v.distance as number, bikeMinutesPerTrip: v.bikeMinutes ?? null, speedKmh: v.speed as number });
    if (!r.ok) return r;
    const d = r.data;
    const gain = d.savedMinutesPerDay > 0;
    return {
      ok: true,
      data: {
        hero: gain
          ? {
              eyebrow: "Tempo recuperado por ano",
              value: `${decimal(d.hoursPerYear)} horas`,
              conclusion: `Você recuperaria aproximadamente ${decimal(d.hoursPerYear)} horas por ano. Isso equivale a ${decimal(d.fullDaysPerYear)} dias completos. Esse tempo pode virar família, estudo, saúde, descanso ou simplesmente tempo para você.`,
              favorable: true,
            }
          : {
              eyebrow: d.savedMinutesPerDay === 0 ? "Mesmo tempo" : "A bike levaria mais tempo",
              value: `${decimal(Math.abs(d.hoursPerYear))} horas`,
              conclusion:
                d.savedMinutesPerDay === 0
                  ? "Com esses dados, o trajeto de bike leva o mesmo tempo que hoje."
                  : `Com esses dados, a bike acrescentaria cerca de ${decimal(Math.abs(d.hoursPerYear))} horas por ano ao seu trajeto.`,
              favorable: false,
            },
        metrics: [
          { label: "Horas por semana", value: decimal(d.hoursPerWeek) },
          { label: "Horas por mês", value: decimal(d.hoursPerMonth) },
          { label: "Dias completos por ano", value: decimal(d.fullDaysPerYear) },
          { label: "Bike por trecho", value: `${d.bikeMinutesPerTrip} min${d.bikeTimeEstimated ? " (estimado)" : ""}` },
        ],
        dailyKm: d.dailyKm,
        bikeImpact: () => [{ label: "Ida e volta coberta", value: `${decimal(d.dailyKm)} km/dia` }],
        note: d.bikeTimeEstimated ? `Tempo de bike estimado pela distância a ${decimal(v.speed as number)} km/h. Informe seu tempo real para um resultado mais preciso.` : undefined,
      },
    };
  },
};

export const TOOL_DEFINITIONS: Record<ToolSlug, ToolDefinition> = {
  "carro-vs-bike": ownedVehicle("carro-vs-bike", "carro"),
  "moto-vs-bike": ownedVehicle("moto-vs-bike", "moto"),
  "aplicativos-vs-bike": apps,
  "transporte-publico-vs-bike": transit,
  "veiculo-alugado-vs-bike-propria": rented,
  "meta-entregas": delivery,
  "economia-de-tempo": time,
};

/** Converte strings do formulário: obrigatório vazio → missing; opcional vazio → undefined. */
export function readValues(def: ToolDefinition, raw: Record<string, string>, choices: Choices) {
  const values: Values = {};
  const missing: string[] = [];
  const invalid: Record<string, string> = {};
  for (const f of def.fields) {
    if (f.visible && !f.visible(choices)) continue;
    const s = (raw[f.name] ?? "").trim();
    if (s === "") {
      if (!f.optional) missing.push(f.name);
      continue;
    }
    const n = Number(s.replace(",", "."));
    if (!Number.isFinite(n) || n < 0) invalid[f.name] = `${f.label}: informe um número válido e não negativo.`;
    else if (n < f.range.min || n > f.range.max) invalid[f.name] = `${f.label}: use um valor entre ${f.range.min} e ${f.range.max}.`;
    else values[f.name] = n;
  }
  return { values, missing, invalid };
}

