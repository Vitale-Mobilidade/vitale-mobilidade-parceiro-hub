import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { CostProjectionChart } from "@/components/mobility/CostProjectionChart";
import { BikeResultCard, BudgetSelector, Metric, NumberField, PassengerToggle } from "@/components/mobility/calculator-ui";
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
import { computeBikePaybacks } from "@/lib/mobility/payback-engine";
import { carroVsBikeInsight, computeCarroVsBike } from "@/lib/mobility/carro-vs-bike";
import { computeCostProjection } from "@/lib/mobility/projection-engine";
import {
  QUICK_ORDER_CRITERION,
  recommendQuickComparison,
  type MobilityBikeCandidate,
} from "@/lib/mobility/recommendation-engine";
import { canonicalUrl, pageHead } from "@/lib/seo";

const TITLE = "Carro ou bike elétrica: quanto custa cada um no trajeto? | Vitale Mobilidade";
const DESCRIPTION =
  "Compare o gasto variável do carro no trajeto com o custo de uma bike elétrica real: economia líquida estimada, payback e custo acumulado em 12, 24 e 36 meses.";

export const Route = createFileRoute("/calculadoras/carro-vs-bike")({
  loader: () =>
    getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      path: "/calculadoras/carro-vs-bike",
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Carro ou bike elétrica: quanto custa cada um no trajeto?",
      ogDescription: "Compare o gasto do carro no trajeto com bikes reais com oferta atual, sem cadastro.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora carro vs bike elétrica",
            url: canonicalUrl("/calculadoras/carro-vs-bike"),
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
  component: CalculadoraCarroVsBike,
});

function CalculadoraCarroVsBike() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  const [monthlySpend, setMonthlySpend] = useState("");
  const [dailyKm, setDailyKm] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [replaceablePercent, setReplaceablePercent] = useState("");
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("none");
  const [customBudget, setCustomBudget] = useState("");
  const [needsPassenger, setNeedsPassenger] = useState(false);
  const [keepsVehicle, setKeepsVehicle] = useState<boolean | null>(null);
  const [fixedAvoided, setFixedAvoided] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  const values = useMemo(() => ({
    monthlySpend: parseNumber(monthlySpend),
    dailyKm: parseNumber(dailyKm),
    daysPerWeek: parseNumber(daysPerWeek),
    replaceablePercent: parseNumber(replaceablePercent),
  }), [monthlySpend, dailyKm, daysPerWeek, replaceablePercent]);

  const errors = useMemo(() => ({
    monthlySpend: validateNumber(monthlySpend, "Gasto mensal", LIMITS.monthlyMoney),
    dailyKm: validateNumber(dailyKm, "Distância por dia", LIMITS.dailyKm),
    daysPerWeek: validateNumber(daysPerWeek, "Dias por semana", LIMITS.daysPerWeek),
    replaceablePercent: validateNumber(replaceablePercent, "Percentual substituível", LIMITS.replaceablePercent),
    fixedAvoided: keepsVehicle === false && fixedAvoided.trim() !== ""
      ? validateNumber(fixedAvoided, "Custo fixo evitado", LIMITS.monthlyMoney)
      : null,
    budget:
      budgetMode === "custom"
        ? validateNumber(customBudget, "Orçamento", LIMITS.budget)
        : null,
  }), [monthlySpend, dailyKm, daysPerWeek, replaceablePercent, budgetMode, customBudget, keepsVehicle, fixedAvoided]);

  const requiredValid = !errors.monthlySpend && !errors.dailyKm && !errors.daysPerWeek && !errors.replaceablePercent && !errors.budget && keepsVehicle !== null && !errors.fixedAvoided;
  const costResult = useMemo(() => {
    if (!requiredValid) return null;
    const fixed = keepsVehicle === false && fixedAvoided.trim() !== "" ? parseNumber(fixedAvoided) : undefined;
    return computeCarroVsBike({ ...values, keepsVehicle: keepsVehicle as boolean, fixedAvoidedMonthly: fixed });
  }, [requiredValid, values, keepsVehicle, fixedAvoided]);
  const data = costResult?.ok ? costResult.data : null;
  const hasBikeUse = data !== null && values.replaceablePercent > 0;
  const budget = resolveBudget(budgetMode, customBudget);

  const recommendations = useMemo(() => {
    if (!hasBikeUse || !sourceOk || errors.budget) return null;
    return recommendQuickComparison(candidates, { dailyKm: values.dailyKm, needsPassenger, maxBudget: budget });
  }, [hasBikeUse, sourceOk, errors.budget, candidates, values.dailyKm, needsPassenger, budget]);
  const bikes = recommendations?.ok ? recommendations.bikes : [];

  useEffect(() => {
    if (bikes.length === 0) {
      setSelectedBikeId(null);
      return;
    }
    if (!bikes.some((bike) => bike.bikeId === selectedBikeId)) setSelectedBikeId(bikes[0].bikeId);
  }, [bikes, selectedBikeId]);

  const selectedBike = bikes.find((bike) => bike.bikeId === selectedBikeId) ?? bikes[0];
  const selectedProjection = selectedBike && data
    ? computeCostProjection({
        monthlyCurrentCost: data.currentTotalReplaced,
        monthlyBikeCost: data.bikeTotalCost,
        bikePrice: selectedBike.price,
      })
    : null;

  const markTouched = (name: string) => setTouched((current) => ({ ...current, [name]: true }));
  const visibleError = (name: keyof typeof errors) => (touched[name] ? errors[name] : null);
  const paybacks = data ? computeBikePaybacks(bikes, data.currentTotalReplaced, data.bikeTotalCost) : [];
  const selectedPayback = paybacks.find((p) => p.bike.bikeId === selectedBike?.bikeId);
  const insight = data ? carroVsBikeInsight({ replaceablePercent: values.replaceablePercent, monthlySavings: data.monthlySavings, annualSavings: data.annualSavings, keepsVehicle: keepsVehicle === true, fixedIncluded: data.currentFixedRemoved }) : null;
  const paybackLabel = !selectedPayback || !selectedPayback.projection.ok
    ? "—"
    : selectedPayback.projection.paybackMonths === null
      ? "Sem retorno"
      : `${decimal(selectedPayback.projection.paybackMonths)} meses`;

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-6 sm:py-8">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">CARRO VS BIKE</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
              Carro ou bike elétrica: quanto custa cada um no trajeto?
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
              Informe o gasto variável do carro nesses trajetos e sua rotina. A comparação com até duas bikes reais aparece na hora, sem cadastro.
            </p>
          </div>
        </section>

        <div className="responsive-container space-y-8 py-7 sm:py-10">
          <section aria-labelledby="simulacao" className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-mint/25 text-action"><Calculator className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 id="simulacao" className="text-2xl font-black text-ink">Seu cenário</h2>
                  <p className="text-sm text-muted-foreground">Preencha os campos para ver a estimativa na mesma tela.</p>
                </div>
              </div>

              <div className="mt-6 space-y-5">
                <NumberField
                  name="monthlySpend"
                  label="Gasto mensal variável evitável do carro"
                  value={monthlySpend}
                  onChange={setMonthlySpend}
                  onBlur={() => markTouched("monthlySpend")}
                  suffix="R$/mês"
                  help="Só combustível, pedágio, estacionamento e outros gastos desses trajetos, antes da substituição. Não inclua seguro, IPVA, parcela ou outros custos fixos."
                  error={visibleError("monthlySpend")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField name="dailyKm" label="Km por dia nos trajetos avaliados" help="Distância total atual desses deslocamentos de carro por dia, antes da substituição. O percentual é aplicado depois." value={dailyKm} onChange={setDailyKm} onBlur={() => markTouched("dailyKm")} suffix="km" step="0.1" error={visibleError("dailyKm")} />
                  <NumberField name="daysPerWeek" label="Dias por semana" value={daysPerWeek} onChange={setDaysPerWeek} onBlur={() => markTouched("daysPerWeek")} suffix="dias" step="1" error={visibleError("daysPerWeek")} />
                </div>
                <NumberField
                  name="replaceablePercent"
                  label="Percentual desses trajetos que a bike pode substituir"
                  value={replaceablePercent}
                  onChange={setReplaceablePercent}
                  onBlur={() => markTouched("replaceablePercent")}
                  suffix="%"
                  step="1"
                  help="Com 0%, a economia variável fica zerada e nenhum modelo é sugerido."
                  error={visibleError("replaceablePercent")}
                />

                <fieldset>
                  <legend className="text-sm font-bold text-ink">Você continuará com o carro?</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    {([["Sim", true], ["Não", false]] as const).map(([label, v]) => (
                      <label key={label} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md px-3 text-sm font-bold ring-1 focus-within:ring-2 focus-within:ring-action ${keepsVehicle === v ? "bg-action text-action-foreground ring-action" : "bg-card text-ink ring-line"}`}>
                        <input type="radio" name="keepsVehicle" className="sr-only" checked={keepsVehicle === v} onChange={() => setKeepsVehicle(v)} />
                        {label}
                      </label>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">Responder "Não" não adiciona nenhum valor sozinho. Seguro, IPVA e outros custos fixos só entram se você responder "Não" e digitar o valor em "Ajustar premissas".</p>
                  {keepsVehicle === false && (
                    <details className="mt-3 rounded-md bg-surface p-3 ring-1 ring-line">
                      <summary className="min-h-11 cursor-pointer text-sm font-bold text-ink">Ajustar premissas (opcional)</summary>
                      <div className="mt-3">
                        <NumberField name="fixedAvoided" label="Custo fixo mensal que deixará de existir" value={fixedAvoided} onChange={setFixedAvoided} onBlur={() => markTouched("fixedAvoided")} suffix="R$/mês" help="Seguro, IPVA, licenciamento etc. que de fato desaparecem sem o carro. Em branco = nada somado." error={visibleError("fixedAvoided")} />
                      </div>
                    </details>
                  )}
                </fieldset>

                <BudgetSelector mode={budgetMode} onModeChange={setBudgetMode} custom={customBudget} onCustomChange={setCustomBudget} onTouched={() => markTouched("budget")} error={visibleError("budget")} />
                <PassengerToggle checked={needsPassenger} onChange={setNeedsPassenger} />
              </div>
            </div>

            <section aria-labelledby="resultado" aria-live="polite" className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <h2 id="resultado" className="text-2xl font-black text-ink">Sua estimativa</h2>
              {!data ? (
                <div className="mt-5 grid min-h-72 place-items-center rounded-lg bg-surface p-6 text-center ring-1 ring-line">
                  <div className="max-w-sm">
                    <Calculator className="mx-auto h-9 w-9 text-action" aria-hidden="true" />
                    <p className="mt-3 font-bold text-ink">Preencha seu cenário para começar</p>
                    <p className="mt-2 text-sm text-muted-foreground">Nenhum resultado aparece até todas as informações obrigatórias serem válidas.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <dl className="grid grid-cols-2 gap-3">
                    <Metric label="Gasto evitável do carro/mês" value={brl(data.currentTotalReplaced, true)} />
                    <Metric label="Custo operacional da bike/mês" value={brl(data.bikeTotalCost, true)} />
                    <Metric label={data.monthlySavings >= 0 ? "Economia líquida mensal" : "Diferença líquida mensal"} value={brl(data.monthlySavings, true)} emphasis />
                    <Metric label={data.annualSavings >= 0 ? "Economia líquida anual" : "Diferença líquida anual"} value={brl(data.annualSavings, true)} emphasis />
                    <Metric label={selectedBike ? `Payback estimado · ${selectedBike.name}` : "Payback estimado"} value={paybackLabel} />
                  </dl>
                  <p className={`rounded-md p-4 text-sm leading-relaxed ${data.monthlySavings > 0 ? "bg-mint/20 text-ink" : "bg-surface text-muted-foreground ring-1 ring-line"}`}>{insight}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">Estimativa, não garantia. Economia sem o preço da bike; o preço real entra no payback, no gráfico e nos cards.</p>

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
                <h2 id="bikes" className="text-2xl font-black text-ink">Bikes compatíveis com seu cenário</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{QUICK_ORDER_CRITERION}</p>
              </div>
              {!hasBikeUse ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Com 0% de substituição não existe uso de bike para comparar, então não sugerimos nenhum modelo.</p>
              ) : !sourceOk ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Não conseguimos ler as ofertas atuais agora. Nenhum modelo ou preço foi preenchido por alternativa.</p>
              ) : recommendations && !recommendations.ok ? (
                <div role="alert" className="mt-5 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{recommendations.errors.join(" ")}</div>
              ) : bikes.length === 0 ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Nenhuma bike com oferta atual atende à distância, margem de autonomia, garupa e orçamento informados. Não afrouxamos os filtros.</p>
              ) : (
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  {paybacks.map(({ bike, projection }) => (
                    <BikeResultCard key={bike.bikeId} bike={bike} selected={selectedBike?.bikeId === bike.bikeId} onSelect={() => setSelectedBikeId(bike.bikeId)} projection={projection} position="calculadora_carro_vs_bike" />
                  ))}
                </div>
              )}
            </section>
          )}

          <details className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
            <summary className="min-h-11 cursor-pointer text-xl font-black text-ink">Como calculamos?</summary>
            <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
              <div>
                <h2 className="font-bold text-ink">Carro vs bike</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Gasto evitável = gasto variável informado × percentual substituível (+ custo fixo evitado, somente se você disser que não continuará com o carro e digitar o valor).</li>
                  <li>Responder "não" sozinho não adiciona nenhum valor: não estimamos seguro, IPVA ou depreciação.</li>
                  <li>Km substituídos = km/dia × dias/semana × {decimal(WEEKS_PER_MONTH, 4)} (52 ÷ 12) × percentual.</li>
                  <li>Custo da bike = km substituídos × {brl(QUICK_BIKE_COST.energyPerKm, true)}/km + {brl(QUICK_BIKE_COST.maintenanceMonthly, true)}/mês quando há uso.</li>
                  <li>Economia líquida = gasto substituível − custo operacional da bike; anual = mensal × 12.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-bold text-ink">Projeções e limites</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Nos horizontes de {PROJECTION_MONTHS.join(", ")} meses, o custo da bike inclui seu preço real atual e o custo operacional acumulado.</li>
                  <li>Retorno estimado = preço atual ÷ economia mensal positiva. Com economia zero ou negativa, não existe payback positivo.</li>
                  <li>Valores são arredondados para centavos; as projeções não incluem financiamento, inflação, revenda, depreciação ou imprevistos.</li>
                  <li>Venda do carro, depreciação, financiamento e custos fixos não informados ficam fora.</li>
                </ul>
              </div>
              <div>
                <h2 className="font-bold text-ink">Ofertas e compatibilidade</h2>
                <p className="mt-2">As ofertas são lidas quando a página carrega. Só entram bikes elegíveis, ativas, com preço positivo, link meli.la válido e autonomia declarada com margem de {Math.round((AUTONOMY_SAFETY_MARGIN - 1) * 100)}%. Garupa e orçamento são filtros rígidos.</p>
              </div>
              <div>
                <h2 className="font-bold text-ink">Não é garantia</h2>
                <p className="mt-2">A simulação é uma estimativa determinística baseada nos dados informados e nas premissas acima. Consumo, manutenção e rotina reais podem variar. Nenhum nome, e-mail ou telefone é coletado.</p>
              </div>
            </div>
          </details>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
