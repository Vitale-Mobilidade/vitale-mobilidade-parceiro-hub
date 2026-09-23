import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bike, Calculator, ExternalLink, LineChart, Users } from "lucide-react";
import { CostProjectionChart } from "@/components/mobility/CostProjectionChart";
import { SiteHeader, SiteFooter, BikeMedia } from "@/components/site/site-ui";
import { Button } from "@/components/ui/button";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
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
  recommendQuickComparison,
  type MobilityBikeCandidate,
  type RecommendedBike,
} from "@/lib/mobility/recommendation-engine";
import { canonicalUrl, pageHead } from "@/lib/seo";

const TITLE = "Calculadora de economia: transporte x bike elétrica | Vitale Mobilidade";
const DESCRIPTION =
  "Estime quanto pode economizar por mês ao substituir parte do transporte por uma bike elétrica e veja até duas opções compatíveis com seu cenário.";

export const Route = createFileRoute("/calculadoras/economia")({
  loader: () =>
    getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
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
const BUDGET_PRESETS = [5000, 7000, 10000, 15000] as const;

const brl = (value: number, cents = false) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });
const decimal = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: digits });
const parseNumber = (raw: string) => (raw.trim() === "" ? Number.NaN : Number(raw.replace(",", ".")));

function validateNumber(raw: string, label: string, range: { min: number; max: number }) {
  if (raw.trim() === "") return `${label}: preencha este campo.`;
  const value = parseNumber(raw);
  if (!Number.isFinite(value) || value < 0) return `${label}: informe um número válido e não negativo.`;
  if (value < range.min || value > range.max) return `${label}: use um valor entre ${range.min} e ${range.max}.`;
  return null;
}

function NumberField({
  name,
  label,
  value,
  onChange,
  onBlur,
  suffix,
  help,
  error,
  step = "0.01",
}: {
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  suffix: string;
  help?: string;
  error?: string | null;
  step?: string;
}) {
  const helpId = `${name}-help`;
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={name} className="text-sm font-bold text-ink">{label}</label>
      <div className={`mt-1 flex min-h-12 items-center gap-2 rounded-md bg-background px-3 ring-1 focus-within:ring-2 ${error ? "ring-destructive focus-within:ring-destructive" : "ring-line focus-within:ring-action"}`}>
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          min="0"
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={[help ? helpId : "", error ? errorId : ""].filter(Boolean).join(" ") || undefined}
          className="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none"
        />
        <span className="shrink-0 text-xs text-muted-foreground">{suffix}</span>
      </div>
      {help && <p id={helpId} className="mt-1 text-xs leading-relaxed text-muted-foreground">{help}</p>}
      {error && <p id={errorId} className="mt-1 text-xs font-semibold text-destructive">{error}</p>}
    </div>
  );
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`min-w-0 rounded-md p-4 ${emphasis ? "bg-mint/25" : "bg-surface ring-1 ring-line"}`}>
      <dt className="text-xs font-semibold leading-snug text-muted-foreground">{label}</dt>
      <dd className={`mt-1 break-words font-black text-ink ${emphasis ? "text-2xl sm:text-3xl" : "text-xl"}`}>{value}</dd>
    </div>
  );
}

function BikeResultCard({
  bike,
  selected,
  onSelect,
  monthlyCurrentCost,
  monthlyBikeCost,
}: {
  bike: RecommendedBike;
  selected: boolean;
  onSelect: () => void;
  monthlyCurrentCost: number;
  monthlyBikeCost: number;
}) {
  const projection = computeCostProjection({ monthlyCurrentCost, monthlyBikeCost, bikePrice: bike.price });
  return (
    <article className={`overflow-hidden rounded-lg bg-card ring-2 ${selected ? "ring-action" : "ring-line"}`}>
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className="grid min-h-12 w-full grid-cols-[112px_minmax(0,1fr)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action focus-visible:ring-inset sm:grid-cols-[150px_minmax(0,1fr)]"
      >
        <BikeMedia src={bike.image} name={bike.name} className="h-full min-h-36" />
        <span className="p-4">
          <span className="text-xs font-bold text-action">{selected ? "Opção selecionada" : "Selecionar para projeção"}</span>
          <strong className="mt-1 block text-lg text-ink">{bike.name}</strong>
          <span className="mt-1 block text-xl font-black text-ink">{brl(bike.price)}</span>
          <span className="mt-1 block text-xs text-muted-foreground">Oferta atual registrada pela Vitale no Mercado Livre.</span>
          <span className="mt-2 block text-sm text-ink">
            {bike.autonomyKm} km de autonomia{bike.capacity ? ` · ${bike.capacity} pessoa${bike.capacity > 1 ? "s" : ""}` : ""}
          </span>
        </span>
      </button>
      <div className="border-t border-line p-4">
        <p className="text-sm text-ink">{bike.reason}</p>
        {projection.ok && (
          <div className="mt-3 rounded-md bg-surface p-3 text-sm ring-1 ring-line">
            <p className="font-bold text-ink">
              {projection.paybackMonths === null
                ? "Sem retorno financeiro positivo neste cenário"
                : `Retorno estimado em ${decimal(projection.paybackMonths)} meses`}
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-muted-foreground">
              {projection.points.map((point) => (
                <span key={point.months}>
                  <strong className="block text-ink">{point.months}m</strong>
                  {brl(point.netBalance)}
                </span>
              ))}
            </div>
          </div>
        )}
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="min-h-11 border-line text-action">
            <Link to="/bikes/$slug" params={{ slug: bike.slug }}><Bike aria-hidden="true" /> Conhecer a bike</Link>
          </Button>
          {bike.monitored && (
            <Button asChild variant="outline" className="min-h-11 border-line text-action">
              <Link to="/radar/$bikeId" params={{ bikeId: bike.bikeId }}><LineChart aria-hidden="true" /> Ver preço e histórico</Link>
            </Button>
          )}
          <Button asChild className="min-h-11 bg-action text-primary-foreground hover:bg-action/90 sm:col-span-2">
            <a
              href={bike.link}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackAffiliateClick({ bike_id: bike.bikeId, position: "calculadora_economia" })}
            >
              Ver oferta no Mercado Livre <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

function CalculadoraEconomia() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  const [modal, setModal] = useState<Modal | null>(null);
  const [monthlySpend, setMonthlySpend] = useState("");
  const [dailyKm, setDailyKm] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [replaceablePercent, setReplaceablePercent] = useState("");
  const [budgetMode, setBudgetMode] = useState<"none" | "custom" | `${number}`>("none");
  const [customBudget, setCustomBudget] = useState("");
  const [needsPassenger, setNeedsPassenger] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [selectedBikeId, setSelectedBikeId] = useState<string | null>(null);

  const values = useMemo(() => ({
    monthlySpend: parseNumber(monthlySpend),
    dailyKm: parseNumber(dailyKm),
    daysPerWeek: parseNumber(daysPerWeek),
    replaceablePercent: parseNumber(replaceablePercent),
  }), [monthlySpend, dailyKm, daysPerWeek, replaceablePercent]);

  const errors = useMemo(() => ({
    modal: modal === null ? "Escolha seu meio de transporte atual." : null,
    monthlySpend: validateNumber(monthlySpend, "Gasto mensal", LIMITS.monthlyMoney),
    dailyKm: validateNumber(dailyKm, "Distância por dia", LIMITS.dailyKm),
    daysPerWeek: validateNumber(daysPerWeek, "Dias por semana", LIMITS.daysPerWeek),
    replaceablePercent: validateNumber(replaceablePercent, "Percentual substituível", LIMITS.replaceablePercent),
    budget:
      budgetMode === "custom"
        ? validateNumber(customBudget, "Orçamento", LIMITS.budget)
        : null,
  }), [modal, monthlySpend, dailyKm, daysPerWeek, replaceablePercent, budgetMode, customBudget]);

  const requiredValid = !errors.modal && !errors.monthlySpend && !errors.dailyKm && !errors.daysPerWeek && !errors.replaceablePercent && !errors.budget;
  const costResult = useMemo(() => {
    if (!requiredValid || modal === null) return null;
    return computeQuickMobilityCost({ modal, ...values });
  }, [requiredValid, modal, values]);
  const data = costResult?.ok ? costResult.data : null;
  const hasBikeUse = data !== null && values.replaceablePercent > 0;
  const budget = budgetMode === "none" ? null : budgetMode === "custom" ? parseNumber(customBudget) : Number(budgetMode);

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
              Informe seu gasto aproximado e sua rotina. A estimativa aparece automaticamente, sem cadastro e sem presumir economia.
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
                <fieldset>
                  <legend className="text-sm font-bold text-ink">Como você se desloca hoje?</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {MODALS.map((item) => (
                      <label key={item.key} className={`flex min-h-11 cursor-pointer items-center justify-center rounded-md px-3 text-center text-sm font-semibold ring-1 ${modal === item.key ? "bg-mint/25 text-ink ring-action" : "bg-background text-muted-foreground ring-line"}`}>
                        <input
                          type="radio"
                          name="modal"
                          value={item.key}
                          checked={modal === item.key}
                          onChange={() => { setModal(item.key); markTouched("modal"); }}
                          className="sr-only"
                        />
                        {item.label}
                      </label>
                    ))}
                  </div>
                  {visibleError("modal") && <p className="mt-2 text-xs font-semibold text-destructive">{errors.modal}</p>}
                </fieldset>

                <NumberField
                  name="monthlySpend"
                  label="Gasto mensal aproximado com esse transporte"
                  value={monthlySpend}
                  onChange={setMonthlySpend}
                  onBlur={() => markTouched("monthlySpend")}
                  suffix="R$/mês"
                  help={modal === "carro" || modal === "moto" ? "Informe apenas combustível, pedágio, estacionamento e outros custos do trajeto que deixam de existir. Não inclua seguro, IPVA ou custos fixos do veículo mantido." : "Informe somente a parte mensal ligada aos deslocamentos que você está avaliando."}
                  error={visibleError("monthlySpend")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField name="dailyKm" label="Distância por dia" value={dailyKm} onChange={setDailyKm} onBlur={() => markTouched("dailyKm")} suffix="km" step="0.1" error={visibleError("dailyKm")} />
                  <NumberField name="daysPerWeek" label="Dias por semana" value={daysPerWeek} onChange={setDaysPerWeek} onBlur={() => markTouched("daysPerWeek")} suffix="dias" step="1" error={visibleError("daysPerWeek")} />
                </div>
                <NumberField
                  name="replaceablePercent"
                  label="Quanto desse uso pode ser substituído pela bike?"
                  value={replaceablePercent}
                  onChange={setReplaceablePercent}
                  onBlur={() => markTouched("replaceablePercent")}
                  suffix="%"
                  step="1"
                  help="Com 0%, a economia e o uso da bike ficam zerados e nenhum modelo é sugerido."
                  error={visibleError("replaceablePercent")}
                />

                <fieldset>
                  <legend className="text-sm font-bold text-ink">Orçamento da bike <span className="font-normal text-muted-foreground">(opcional)</span></legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button type="button" variant={budgetMode === "none" ? "default" : "outline"} onClick={() => { setBudgetMode("none"); markTouched("budget"); }} className={budgetMode === "none" ? "min-h-11 bg-action" : "min-h-11 border-line"}>Sem limite</Button>
                    {BUDGET_PRESETS.map((amount) => (
                      <Button key={amount} type="button" variant={budgetMode === String(amount) ? "default" : "outline"} onClick={() => { setBudgetMode(String(amount) as `${number}`); markTouched("budget"); }} className={budgetMode === String(amount) ? "min-h-11 bg-action" : "min-h-11 border-line"}>Até {brl(amount)}</Button>
                    ))}
                    <Button type="button" variant={budgetMode === "custom" ? "default" : "outline"} onClick={() => { setBudgetMode("custom"); markTouched("budget"); }} className={budgetMode === "custom" ? "min-h-11 bg-action" : "min-h-11 border-line"}>Outro valor</Button>
                  </div>
                  {budgetMode === "custom" && (
                    <div className="mt-3 max-w-xs">
                      <NumberField name="customBudget" label="Outro orçamento máximo" value={customBudget} onChange={setCustomBudget} onBlur={() => markTouched("budget")} suffix="R$" error={visibleError("budget")} />
                    </div>
                  )}
                </fieldset>

                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4 rounded-md bg-surface px-4 py-3 ring-1 ring-line">
                  <span className="flex items-center gap-3 text-sm font-bold text-ink"><Users className="h-5 w-5 text-action" aria-hidden="true" /> Preciso levar garupa</span>
                  <input type="checkbox" checked={needsPassenger} onChange={(event) => setNeedsPassenger(event.target.checked)} className="h-5 w-5 accent-[var(--color-action,currentColor)]" />
                </label>
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
                    <Metric label="Gasto atual substituível" value={brl(data.currentTotalReplaced, true)} />
                    <Metric label="Custo estimado da bike" value={brl(data.bikeTotalCost, true)} />
                    <Metric label={data.monthlySavings >= 0 ? "Economia mensal estimada" : "Diferença mensal estimada"} value={brl(data.monthlySavings, true)} emphasis />
                    <Metric label={data.annualSavings >= 0 ? "Economia anual estimada" : "Diferença anual estimada"} value={brl(data.annualSavings, true)} emphasis />
                  </dl>
                  <p className={`rounded-md p-4 text-sm leading-relaxed ${data.monthlySavings > 0 ? "bg-mint/20 text-ink" : "bg-surface text-muted-foreground ring-1 ring-line"}`}>{insight}</p>
                  <p className="text-xs leading-relaxed text-muted-foreground">Estimativa operacional. O preço de compra da bike não reduz nem aumenta os números acima; ele entra separadamente nas projeções por modelo.</p>

                  {selectedBike && selectedProjection?.ok && hasBikeUse && (
                    <CostProjectionChart points={selectedProjection.points} bikeName={selectedBike.name} />
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
                  {bikes.map((bike) => (
                    <BikeResultCard key={bike.bikeId} bike={bike} selected={selectedBike?.bikeId === bike.bikeId} onSelect={() => setSelectedBikeId(bike.bikeId)} monthlyCurrentCost={data.currentTotalReplaced} monthlyBikeCost={data.bikeTotalCost} />
                  ))}
                </div>
              )}
            </section>
          )}

          <details className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
            <summary className="min-h-11 cursor-pointer text-xl font-black text-ink">Como calculamos?</summary>
            <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
              <div>
                <h2 className="font-bold text-ink">Economia operacional</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Gasto substituível = gasto mensal informado × percentual substituível.</li>
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
                  <li>Para carro e moto, o gasto principal deve excluir seguro, IPVA e outros custos fixos do veículo que continuará sendo mantido.</li>
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
