import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { CostProjectionChart } from "@/components/mobility/CostProjectionChart";
import { BikeComparison } from "@/components/mobility/TimeProjectionChart";
import {
  BikeResultCard,
  BudgetSelector,
  Metric,
  NumberField,
  HillsToggle,
  PassengerToggle,
  RecommendationFooter,
  ResultHero,
} from "@/components/mobility/calculator-ui";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { brl, decimal, parseNumber, resolveBudget, validateNumber, type BudgetMode } from "@/lib/mobility/format";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import {
  AUTONOMY_SAFETY_MARGIN,
  LIMITS,
  PROJECTION_MONTHS,
  QUICK_BIKE_COST,
  WEEKS_PER_MONTH,
} from "@/lib/mobility/config";
import { computeQuickMobilityCost, type Modal } from "@/lib/mobility/cost-engine";
import { computeCostProjection } from "@/lib/mobility/projection-engine";
import {
  QUICK_ORDER_CRITERION,
  recommendScenarioPair,
  type MobilityBikeCandidate,
} from "@/lib/mobility/recommendation-engine";
import { canonicalUrl, pageHead } from "@/lib/seo";

const TITLE = "Calculadora de economia: transporte x bike elétrica | Vitale Mobilidade";
const DESCRIPTION =
  "Estime quanto pode economizar por mês fazendo de bike elétrica os trajetos que você escolher e veja até duas opções reais compatíveis.";

export const Route = createFileRoute("/calculadoras/economia")({
  loader: () => getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      path: "/calculadoras/economia",
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Quanto você pode economizar usando uma bike elétrica?",
      ogDescription: "Simulação rápida com seus dados e ofertas atuais de bikes compatíveis, sem cadastro.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora de economia com bike elétrica",
            url: canonicalUrl("/calculadoras/economia"),
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            publisher: { "@type": "Organization", name: "Vitale Mobilidade" },
          }),
        },
      ],
    };
  },
  component: CalculadoraEconomia,
});

const MODALS: { key: Modal; label: string }[] = [
  { key: "carro", label: "Carro" },
  { key: "uber", label: "Uber / 99" },
  { key: "transporte_publico", label: "Transporte público" },
  { key: "moto", label: "Moto" },
  { key: "misto", label: "Misto" },
];
function CalculadoraEconomia() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  const [modal, setModal] = useState<Modal | null>(null);
  const [monthlySpend, setMonthlySpend] = useState("");
  const [dailyKm, setDailyKm] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("none");
  const [customBudget, setCustomBudget] = useState("");
  const [needsPassenger, setNeedsPassenger] = useState(false);
  const [needsHills, setNeedsHills] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  const values = useMemo(
    () => ({
      monthlySpend: parseNumber(monthlySpend),
      dailyKm: parseNumber(dailyKm),
      daysPerWeek: parseNumber(daysPerWeek),
      // 100% do subconjunto que a pessoa escolheu informar (só os trajetos que faria de bike).
      replaceablePercent: 100,
    }),
    [monthlySpend, dailyKm, daysPerWeek],
  );

  const errors = useMemo(
    () => ({
      modal: modal === null ? "Escolha seu meio de transporte atual." : null,
      monthlySpend: validateNumber(monthlySpend, "Gasto mensal", LIMITS.monthlyMoney),
      dailyKm: validateNumber(dailyKm, "Distância por dia", LIMITS.dailyKm),
      daysPerWeek: validateNumber(daysPerWeek, "Dias por semana", LIMITS.daysPerWeek),
      budget: budgetMode === "custom" ? validateNumber(customBudget, "Orçamento", LIMITS.budget) : null,
    }),
    [modal, monthlySpend, dailyKm, daysPerWeek, budgetMode, customBudget],
  );

  const requiredValid =
    !errors.modal && !errors.monthlySpend && !errors.dailyKm && !errors.daysPerWeek && !errors.budget;
  const costResult = useMemo(() => {
    if (!requiredValid || modal === null) return null;
    return computeQuickMobilityCost({ modal, ...values });
  }, [requiredValid, modal, values]);
  const data = costResult?.ok ? costResult.data : null;
  const hasBikeUse = data !== null && values.monthlySpend > 0;
  const budget = resolveBudget(budgetMode, customBudget);

  const recommendations = useMemo(() => {
    if (!hasBikeUse || !sourceOk || errors.budget) return null;
    return recommendScenarioPair(candidates, {
      dailyKm: values.dailyKm,
      needsPassenger,
      needsHills,
      maxBudget: budget,
    });
  }, [hasBikeUse, sourceOk, errors.budget, candidates, values.dailyKm, needsPassenger, needsHills, budget]);
  const bikes = recommendations?.ok ? recommendations.bikes : [];

  useEffect(() => {
    if (bikes.length === 0) {
      setSelectedBikeId(null);
      return;
    }
    if (!bikes.some((bike) => bike.bikeId === selectedBikeId)) setSelectedBikeId(bikes[0].bikeId);
  }, [bikes, selectedBikeId]);

  const selectedBike = bikes.find((bike) => bike.bikeId === selectedBikeId) ?? bikes[0];
  const selectedProjection =
    selectedBike && data
      ? computeCostProjection({
          monthlyCurrentCost: data.currentTotalReplaced,
          monthlyBikeCost: data.bikeTotalCost,
          bikePrice: selectedBike.price,
        })
      : null;

  const markTouched = (name: string) => setTouched((current) => ({ ...current, [name]: true }));
  const visibleError = (name: keyof typeof errors) => (touched[name] ? errors[name] : null);
  const insight = data
    ? data.monthlySavings > 0
      ? `Neste cenário, a operação da bike custa ${brl(data.bikeTotalCost, true)} por mês e deixa uma diferença positiva estimada de ${brl(data.monthlySavings, true)}.`
      : data.monthlySavings === 0
        ? "Neste cenário, os custos operacionais estimados ficam iguais. Não há retorno financeiro positivo para projetar."
        : `Neste cenário, usar a bike acrescenta ${brl(Math.abs(data.monthlySavings), true)} por mês. Não há retorno financeiro positivo.`
    : null;

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-6 sm:py-8">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">CALCULADORA DE ECONOMIA</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
              Quanto você pode economizar por mês usando uma bike elétrica?
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
              Informe o gasto e a distância só dos trajetos que faria de bike. A estimativa aparece na hora, sem
              cadastro e sem presumir economia.
            </p>
          </div>
        </section>

        <div className="responsive-container space-y-8 py-7 sm:py-10">
          <section aria-labelledby="simulacao" className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-mint/25 text-action">
                  <Calculator className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="simulacao" className="text-2xl font-black text-ink">
                    Seu cenário
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Preencha os campos para ver a estimativa na mesma tela.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <fieldset>
                  <legend className="text-sm font-bold text-ink">Como você se desloca hoje?</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MODALS.map((item) => (
                      <label
                        key={item.key}
                        className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md px-3 text-center text-sm font-semibold ring-1 ${modal === item.key ? "bg-mint/25 text-ink ring-action" : "bg-background text-muted-foreground ring-line"}`}
                      >
                        <input
                          type="radio"
                          name="modal"
                          value={item.key}
                          checked={modal === item.key}
                          onChange={() => {
                            setModal(item.key);
                            markTouched("modal");
                          }}
                          className="sr-only"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                  {visibleError("modal") && (
                    <p className="mt-2 text-xs font-semibold text-destructive">{errors.modal}</p>
                  )}
                </fieldset>

                <NumberField
                  name="monthlySpend"
                  label="Gasto mensal só nos trajetos que faria de bike"
                  value={monthlySpend}
                  onChange={setMonthlySpend}
                  onBlur={() => markTouched("monthlySpend")}
                  suffix="R$/mês"
                  help={`Exemplo: se gasta R$ 1.000 no mês, mas R$ 600 são dos trajetos que faria de bike, informe R$ 600.${modal === "carro" || modal === "moto" ? " Só combustível, pedágio e estacionamento desses trajetos; não inclua seguro, IPVA ou custos fixos do veículo mantido." : ""}`}
                  error={visibleError("monthlySpend")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField
                    name="dailyKm"
                    label="Km por dia desses trajetos"
                    help="Ida + volta, somando só os trajetos que faria de bike."
                    value={dailyKm}
                    onChange={setDailyKm}
                    onBlur={() => markTouched("dailyKm")}
                    suffix="km"
                    step="0.1"
                    error={visibleError("dailyKm")}
                  />
                  <NumberField
                    name="daysPerWeek"
                    label="Dias por semana de bike"
                    value={daysPerWeek}
                    onChange={setDaysPerWeek}
                    onBlur={() => markTouched("daysPerWeek")}
                    suffix="dias"
                    step="1"
                    error={visibleError("daysPerWeek")}
                  />
                </div>

                <BudgetSelector
                  mode={budgetMode}
                  onModeChange={setBudgetMode}
                  custom={customBudget}
                  onCustomChange={setCustomBudget}
                  onTouched={() => markTouched("budget")}
                  error={visibleError("budget")}
                />
                <PassengerToggle checked={needsPassenger} onChange={setNeedsPassenger} />
                <HillsToggle checked={needsHills} onChange={setNeedsHills} />
              </div>
            </div>

            <section
              aria-labelledby="resultado"
              aria-live="polite"
              className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6"
            >
              <h2 id="resultado" className="text-2xl font-black text-ink">
                Sua estimativa
              </h2>
              {!data ? (
                <div className="mt-5 grid min-h-72 place-items-center rounded-lg bg-surface p-6 text-center ring-1 ring-line">
                  <div className="max-w-sm">
                    <Calculator className="mx-auto h-9 w-9 text-action" aria-hidden="true" />
                    <p className="mt-3 font-bold text-ink">Preencha seu cenário para começar</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhum resultado aparece até todas as informações obrigatórias serem válidas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <ResultHero
                    eyebrow={data.monthlySavings > 0 ? "Economia estimada no seu cenário" : "O custo no seu cenário"}
                    value={brl(Math.abs(data.monthlySavings), true)}
                    favorable={data.monthlySavings > 0}
                    conclusion={
                      data.monthlySavings > 0
                        ? "por mês que pode deixar de gastar nesses trajetos, já descontado o custo operacional estimado da bike. O investimento na bike aparece na projeção abaixo."
                        : data.monthlySavings < 0
                          ? "por mês a mais com a bike nos trajetos informados. O investimento inicial é contabilizado separadamente na projeção."
                          : "de diferença mensal com os dados informados. Compare as opções antes de decidir."
                    }
                  />
                  <dl className="grid grid-cols-2 gap-3">
                    <Metric label="Gasto atual nesses trajetos" value={brl(data.currentTotalReplaced, true)} />
                    <Metric label="Custo estimado da bike" value={brl(data.bikeTotalCost, true)} />
                    <Metric
                      label={data.monthlySavings >= 0 ? "Economia mensal estimada" : "Diferença mensal estimada"}
                      value={brl(data.monthlySavings, true)}
                      emphasis
                    />
                    <Metric
                      label={data.annualSavings >= 0 ? "Economia anual estimada" : "Diferença anual estimada"}
                      value={brl(data.annualSavings, true)}
                      emphasis
                    />
                  </dl>
                  <p
                    className={`rounded-md p-4 text-sm leading-relaxed ${data.monthlySavings > 0 ? "bg-mint/20 text-ink" : "bg-surface text-muted-foreground ring-1 ring-line"}`}
                  >
                    {insight}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Estimativa operacional. O preço de compra da bike não reduz nem aumenta os números acima; ele entra
                    separadamente nas projeções por modelo.
                  </p>

                  {selectedBike && selectedProjection?.ok && hasBikeUse && (
                    <CostProjectionChart
                      points={selectedProjection.points}
                      bikeName={selectedBike.name}
                      bikePrice={selectedBike.price}
                    />
                  )}
                </div>
              )}
            </section>
          </section>

          {data && (
            <section aria-labelledby="bikes" className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
              <div className="max-w-3xl">
                <h2 id="bikes" className="text-2xl font-black text-ink">
                  Bikes compatíveis com seu cenário
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{QUICK_ORDER_CRITERION}</p>
              </div>
              {!hasBikeUse ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">
                  Com gasto zero nesses trajetos, a bike não tem o que substituir: o resultado acima é o custo real dela
                  e nenhum modelo é sugerido.
                </p>
              ) : !sourceOk ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">
                  Não conseguimos ler as ofertas atuais agora. Nenhum modelo ou preço foi preenchido por alternativa.
                </p>
              ) : recommendations && !recommendations.ok ? (
                <div role="alert" className="mt-5 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  {recommendations.errors.join(" ")}
                </div>
              ) : bikes.length === 0 ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">
                  Nenhuma bike com oferta atual atende à distância, margem de autonomia, garupa e orçamento informados.
                  Não afrouxamos os filtros.
                </p>
              ) : (
                <>
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    {bikes.map((bike) => (
                      <BikeResultCard
                        key={bike.bikeId}
                        bike={bike}
                        selected={selectedBike?.bikeId === bike.bikeId}
                        onSelect={() => setSelectedBikeId(bike.bikeId)}
                        projection={computeCostProjection({
                          monthlyCurrentCost: data.currentTotalReplaced,
                          monthlyBikeCost: data.bikeTotalCost,
                          bikePrice: bike.price,
                        })}
                        position="calculadora_economia"
                      />
                    ))}
                  </div>
                  <div className="mt-5">
                    <BikeComparison bikes={bikes} />
                  </div>
                  <RecommendationFooter
                    bikes={bikes}
                    hillsRequested={needsHills}
                    budgetInformed={budget !== null}
                    eligibleCount={recommendations?.ok ? (recommendations.eligibleCount ?? bikes.length) : bikes.length}
                  />
                </>
              )}
            </section>
          )}

          <details className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
            <summary className="min-h-11 cursor-pointer text-xl font-black text-ink">Como calculamos?</summary>
            <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
              <div>
                <h2 className="font-bold text-ink">Economia operacional</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    Você informa só o gasto, a distância e os dias dos trajetos que faria de bike; todo esse conjunto é
                    considerado substituído. Nada é presumido sobre o restante dos seus gastos.
                  </li>
                  <li>Km de bike por mês = km/dia × dias/semana × {decimal(WEEKS_PER_MONTH, 4)} (52 ÷ 12).</li>
                  <li>
                    Custo da bike = km de bike por mês × {brl(QUICK_BIKE_COST.energyPerKm, true)}/km +{" "}
                    {brl(QUICK_BIKE_COST.maintenanceMonthly, true)}/mês quando há uso.
                  </li>
                  <li>Economia líquida = gasto desses trajetos − custo operacional da bike; anual = mensal × 12.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-bold text-ink">Projeções e limites</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>
                    Nos horizontes de {PROJECTION_MONTHS.join(", ")} meses, o custo da bike inclui seu preço real atual
                    e o custo operacional acumulado.
                  </li>
                  <li>
                    Retorno estimado = preço atual ÷ economia mensal positiva. Com economia zero ou negativa, não existe
                    payback positivo.
                  </li>
                  <li>
                    Valores são arredondados para centavos; as projeções não incluem financiamento, inflação, revenda,
                    depreciação ou imprevistos.
                  </li>
                  <li>
                    Para carro e moto, o gasto principal deve excluir seguro, IPVA e outros custos fixos do veículo que
                    continuará sendo mantido.
                  </li>
                </ul>
              </div>
              <div>
                <h2 className="font-bold text-ink">Ofertas e compatibilidade</h2>
                <p className="mt-2">
                  As ofertas são lidas quando a página carrega. Só entram bikes elegíveis, ativas, com preço positivo,
                  link meli.la válido e autonomia declarada com margem de{" "}
                  {Math.round((AUTONOMY_SAFETY_MARGIN - 1) * 100)}%. Garupa e orçamento são filtros rígidos.
                </p>
              </div>
              <div>
                <h2 className="font-bold text-ink">Não é garantia</h2>
                <p className="mt-2">
                  A simulação é uma estimativa determinística baseada nos dados informados e nas premissas acima.
                  Consumo, manutenção e rotina reais podem variar. Nenhum nome, e-mail ou telefone é coletado.
                </p>
              </div>
            </div>
          </details>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
