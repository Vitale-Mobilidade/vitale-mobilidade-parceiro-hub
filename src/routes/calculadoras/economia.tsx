import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Bike, Calculator, ExternalLink, LineChart } from "lucide-react";
import { SiteHeader, SiteFooter, BikeMedia } from "@/components/site/site-ui";
import { pageHead, canonicalUrl } from "@/lib/seo";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import { WEEKS_PER_MONTH, AUTONOMY_SAFETY_MARGIN, LIMITS } from "@/lib/mobility/config";
import { computeMobilityCost, type CostInput, type Modal } from "@/lib/mobility/cost-engine";
import {
  recommendBikes,
  ORDER_CRITERION,
  type MobilityBikeCandidate,
} from "@/lib/mobility/recommendation-engine";

/*
 * Calculadora de economia (primeira ferramenta funcional do hub).
 * - Cálculo 100% determinístico no cliente, com premissas visíveis e editáveis.
 * - Nenhuma captura de nome, e-mail ou telefone.
 * - Bikes sugeridas vêm de dados reais (Quiz elegível ∩ oferta atual), sem fallback estático.
 * - Sem amortização do preço da bike: payback fica para a rota futura.
 */

const TITLE = "Calculadora de economia: carro, Uber ou ônibus x bike elétrica | Vitale Mobilidade";
const DESCRIPTION =
  "Calcule quanto você economiza por mês e por ano trocando carro, moto, Uber ou transporte público por uma bike elétrica. Todas as premissas são suas e ficam visíveis.";

export const Route = createFileRoute("/calculadoras/economia")({
  loader: () =>
    getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      path: "/calculadoras/economia",
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Quanto você economiza trocando o carro pela bike elétrica?",
      ogDescription:
        "Calculadora determinística da Vitale: seus custos, suas premissas, resultado mensal e anual sem cadastro.",
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

const MODALS: { key: Modal; label: string; hint: string }[] = [
  { key: "carro", label: "Carro", hint: "Combustível, pedágio, estacionamento e custos fixos" },
  { key: "uber", label: "Uber / 99", hint: "Custo médio por km rodado" },
  { key: "transporte_publico", label: "Transporte público", hint: "Tarifa por embarque e embarques por dia" },
  { key: "moto", label: "Moto", hint: "Combustível, pedágio e custos fixos" },
  { key: "misto", label: "Misto", hint: "Gasto mensal total que você já conhece" },
];

const brl = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });
const dec = (v: number, d = 2) =>
  v.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: d });
const numberOrNaN = (s: string) => (s.trim() === "" ? Number.NaN : Number(s.replace(",", ".")));

function Field({
  name,
  label,
  value,
  onChange,
  suffix,
  step = "0.01",
  help,
  error,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  step?: string;
  help?: string;
  error?: string;
}) {
  const helpId = `${name}-help`;
  const errorId = `${name}-error`;
  return (
    <div className="block">
      <label htmlFor={name} className="text-sm font-semibold text-ink">
        {label}
      </label>
      <span
        className={`mt-1 flex items-center gap-2 rounded-xl bg-surface px-3 ring-1 focus-within:ring-2 ${
          error ? "ring-destructive focus-within:ring-destructive" : "ring-line focus-within:ring-action"
        }`}
      >
        <input
          id={name}
          name={name}
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          value={value}
          aria-invalid={error ? true : undefined}
          aria-describedby={[help ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined}
          onChange={(e) => onChange(e.target.value)}
          className="h-12 w-full bg-transparent text-base text-ink outline-none"
        />
        {suffix && <span className="shrink-0 text-sm text-muted-foreground">{suffix}</span>}
      </span>
      {help && (
        <span id={helpId} className="mt-1 block text-xs text-muted-foreground">
          {help}
        </span>
      )}
      {error && (
        <span id={errorId} className="mt-1 block text-xs font-semibold text-destructive">
          {error}
        </span>
      )}
    </div>
  );
}

/** Campo obrigatório: vazio é erro, nunca um número presumido pela Vitale. */
function requireNumber(raw: string, label: string, range: { min: number; max: number }): string | null {
  if (raw.trim() === "") return `${label}: preencha este campo. Não preenchemos nada por você.`;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return `${label}: informe um número válido e não negativo.`;
  if (n < range.min || n > range.max) return `${label}: use um valor entre ${range.min} e ${range.max}.`;
  return null;
}

function CalculadoraEconomia() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();

  // Nenhum campo de cálculo começa preenchido: todo número exibido veio do usuário.
  const [step, setStep] = useState(0);
  const [modal, setModal] = useState<Modal | null>(null);
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [dailyKm, setDailyKm] = useState("");
  const [percent, setPercent] = useState("");

  const [fuelPrice, setFuelPrice] = useState("");
  const [kmPerLiter, setKmPerLiter] = useState("");
  const [extras, setExtras] = useState("");
  const [fixedMonthly, setFixedMonthly] = useState("");
  const [keepsVehicle, setKeepsVehicle] = useState<boolean | null>(null);
  const [ridePerKm, setRidePerKm] = useState("");
  const [fare, setFare] = useState("");
  const [tripsPerDay, setTripsPerDay] = useState("");
  const [mixedSpend, setMixedSpend] = useState("");

  const [energyPerKm, setEnergyPerKm] = useState("");
  const [maintenance, setMaintenance] = useState("");
  const [needsPassenger, setNeedsPassenger] = useState(false);
  const [maxBudget, setMaxBudget] = useState("");

  // Erros por campo, preenchidos só quando o usuário tenta avançar.
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isVehicle = modal === "carro" || modal === "moto";
  const percentNum = numberOrNaN(percent);
  const hasReplacement = Number.isFinite(percentNum) && percentNum > 0;

  const input: CostInput | null = useMemo(
    () =>
      modal === null
        ? null
        : {
            modal,
            daysPerWeek: numberOrNaN(daysPerWeek),
            dailyKm: numberOrNaN(dailyKm),
            replaceablePercent: numberOrNaN(percent),
            vehicle: isVehicle
              ? {
                  fuelPricePerLiter: numberOrNaN(fuelPrice),
                  kmPerLiter: numberOrNaN(kmPerLiter),
                  variableExtrasMonthly: numberOrNaN(extras),
                  fixedMonthly: numberOrNaN(fixedMonthly),
                  // `null` (sem resposta) chega ao motor como valor inválido e é recusado.
                  keepsVehicle: keepsVehicle as boolean,
                }
              : undefined,
            ridePricePerKm: modal === "uber" ? numberOrNaN(ridePerKm) : undefined,
            transit:
              modal === "transporte_publico"
                ? { farePerTrip: numberOrNaN(fare), tripsPerDay: numberOrNaN(tripsPerDay) }
                : undefined,
            mixedMonthlySpend: modal === "misto" ? numberOrNaN(mixedSpend) : undefined,
            bike: { energyCostPerKm: numberOrNaN(energyPerKm), maintenanceMonthly: numberOrNaN(maintenance) },
          },
    [
      modal, daysPerWeek, dailyKm, percent, isVehicle, fuelPrice, kmPerLiter, extras, fixedMonthly,
      keepsVehicle, ridePerKm, fare, tripsPerDay, mixedSpend, energyPerKm, maintenance,
    ],
  );

  const result = useMemo(
    () => (step === 2 && input ? computeMobilityCost(input) : null),
    [step, input],
  );

  const recommendation = useMemo(() => {
    // Sem resultado válido, sem catálogo ou com 0% de substituição não há o que recomendar.
    if (!result?.ok || !sourceOk || !hasReplacement) return null;
    const budget = maxBudget.trim() === "" ? null : numberOrNaN(maxBudget);
    return recommendBikes(candidates, {
      dailyKm: numberOrNaN(dailyKm),
      needsPassenger,
      maxBudget: budget,
    });
  }, [result, sourceOk, hasReplacement, candidates, dailyKm, needsPassenger, maxBudget]);

  /** Etapa 1: cenário de deslocamento. Nada avança sem modal escolhido e números informados. */
  function validateStep0(): boolean {
    const e: Record<string, string> = {};
    if (modal === null) e.modal = "Escolha como você se desloca hoje.";
    const d = requireNumber(daysPerWeek, "Dias por semana", LIMITS.daysPerWeek);
    if (d) e.daysPerWeek = d;
    const k = requireNumber(dailyKm, "Distância por dia", LIMITS.dailyKm);
    if (k) e.dailyKm = k;
    const p = requireNumber(percent, "Percentual substituível", LIMITS.replaceablePercent);
    if (p) e.percent = p;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  /** Etapa 2: custos e premissas. O resultado só aparece depois daqui. */
  function validateStep1(): boolean {
    const e: Record<string, string> = {};
    if (isVehicle) {
      const f = requireNumber(fuelPrice, "Preço do combustível", LIMITS.moneyPerUnit);
      if (f) e.fuelPrice = f;
      const c = requireNumber(kmPerLiter, "Consumo (km/litro)", LIMITS.kmPerLiter);
      if (c) e.kmPerLiter = c;
      const x = requireNumber(extras, "Pedágio e estacionamento", LIMITS.monthlyMoney);
      if (x) e.extras = x;
      const fx = requireNumber(fixedMonthly, "Custos fixos do veículo", LIMITS.monthlyMoney);
      if (fx) e.fixedMonthly = fx;
      if (keepsVehicle === null) e.keepsVehicle = "Responda se você vai continuar mantendo o veículo.";
    }
    if (modal === "uber") {
      const r = requireNumber(ridePerKm, "Custo por km no aplicativo", LIMITS.moneyPerUnit);
      if (r) e.ridePerKm = r;
    }
    if (modal === "transporte_publico") {
      const t = requireNumber(fare, "Tarifa por embarque", LIMITS.moneyPerUnit);
      if (t) e.fare = t;
      const n = requireNumber(tripsPerDay, "Embarques por dia", LIMITS.tripsPerDay);
      if (n) e.tripsPerDay = n;
    }
    if (modal === "misto") {
      const m = requireNumber(mixedSpend, "Gasto mensal atual com transporte", LIMITS.monthlyMoney);
      if (m) e.mixedSpend = m;
    }
    const en = requireNumber(energyPerKm, "Energia por km da bike", LIMITS.moneyPerUnit);
    if (en) e.energyPerKm = en;
    const mt = requireNumber(maintenance, "Manutenção mensal da bike", LIMITS.monthlyMoney);
    if (mt) e.maintenance = mt;
    if (maxBudget.trim() !== "") {
      const b = requireNumber(maxBudget, "Orçamento máximo", LIMITS.budget);
      if (b) e.maxBudget = b;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function goNext() {
    const ok = step === 0 ? validateStep0() : validateStep1();
    if (ok) setStep((s) => s + 1);
  }

  function goBack() {
    // Voltar preserva tudo o que já foi digitado e limpa apenas as mensagens de erro.
    setErrors({});
    setStep((s) => s - 1);
  }

  const errorList = Object.values(errors);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-7 sm:py-9">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">CALCULADORA DE ECONOMIA</p>
            <h1 className="entry-h1 mt-2 max-w-3xl text-2xl sm:text-3xl lg:text-4xl">
              Quanto você pode economizar por mês usando uma bike elétrica?
            </h1>
            <p className="mt-3 max-w-2xl text-base text-ink-foreground/80 sm:text-lg">
              Informe seus custos de hoje e quanto do trajeto pretende substituir: o cálculo aparece inteiro na tela,
              sem pedir nome, e-mail nem telefone.
            </p>
          </div>
        </section>

        <div className="responsive-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:py-14">
          {/* ---------- Formulário progressivo ---------- */}
          <section aria-labelledby="form" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-7">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-mint/25 text-action">
                <Calculator className="h-5 w-5" aria-hidden="true" />
              </span>
              <h2 id="form" className="section-h2 text-ink">
                {step === 0 ? "1. Seu deslocamento hoje" : step === 1 ? "2. Custos e premissas" : "3. Seu resultado"}
              </h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">Etapa {step + 1} de 3</p>

            {errorList.length > 0 && (
              <div
                role="alert"
                tabIndex={-1}
                className="mt-5 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive"
              >
                <p className="font-bold">Faltam informações para continuar:</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errorList.map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              </div>
            )}

            {step === 0 && (
              <div className="mt-6 space-y-5">
                <fieldset>
                  <legend className="text-sm font-semibold text-ink">
                    Como você se desloca hoje? (escolha uma opção)
                  </legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {MODALS.map((m) => (
                      <label
                        key={m.key}
                        className={`flex cursor-pointer flex-col rounded-xl px-4 py-3 ring-1 ${
                          modal === m.key ? "bg-mint/20 ring-action" : "bg-surface ring-line"
                        }`}
                      >
                        <span className="flex items-center gap-2 font-semibold text-ink">
                          <input
                            type="radio"
                            name="modal"
                            className="h-4 w-4 accent-[var(--color-action,currentColor)]"
                            checked={modal === m.key}
                            onChange={() => setModal(m.key)}
                          />
                          {m.label}
                        </span>
                        <span className="mt-1 pl-6 text-xs text-muted-foreground">{m.hint}</span>
                      </label>
                    ))}
                  </div>
                  {errors.modal && (
                    <p className="mt-2 text-xs font-semibold text-destructive">{errors.modal}</p>
                  )}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    name="daysPerWeek"
                    label="Dias por semana"
                    value={daysPerWeek}
                    onChange={setDaysPerWeek}
                    suffix="dias"
                    step="1"
                    error={errors.daysPerWeek}
                  />
                  <Field
                    name="dailyKm"
                    label="Distância por dia"
                    value={dailyKm}
                    onChange={setDailyKm}
                    suffix="km"
                    step="0.1"
                    error={errors.dailyKm}
                  />
                </div>
                <Field
                  name="percent"
                  label="Quanto desse trajeto dá para fazer de bike?"
                  value={percent}
                  onChange={setPercent}
                  suffix="%"
                  step="1"
                  help="0% significa nenhuma substituição: o resultado será zero, sem custo de bike e sem sugestão de modelos."
                  error={errors.percent}
                />
              </div>
            )}

            {step === 1 && (
              <div className="mt-6 space-y-5">
                {isVehicle && (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field
                        name="fuelPrice"
                        label="Preço do combustível"
                        value={fuelPrice}
                        onChange={setFuelPrice}
                        suffix="R$/litro"
                        error={errors.fuelPrice}
                      />
                      <Field
                        name="kmPerLiter"
                        label="Consumo do veículo"
                        value={kmPerLiter}
                        onChange={setKmPerLiter}
                        suffix="km/litro"
                        step="0.1"
                        error={errors.kmPerLiter}
                      />
                    </div>
                    <Field
                      name="extras"
                      label="Pedágio e estacionamento por mês"
                      value={extras}
                      onChange={setExtras}
                      suffix="R$/mês"
                      help="Custos variáveis ligados a esses trajetos. Digite 0 se você não tem esse custo."
                      error={errors.extras}
                    />
                    <Field
                      name="fixedMonthly"
                      label="Custos fixos do veículo por mês"
                      value={fixedMonthly}
                      onChange={setFixedMonthly}
                      suffix="R$/mês"
                      help="Seguro, IPVA, licenciamento e manutenção periódica. Digite 0 se você não tem esse custo."
                      error={errors.fixedMonthly}
                    />
                    <fieldset className="rounded-xl bg-surface p-4 ring-1 ring-line">
                      <legend className="text-sm font-semibold text-ink">
                        Você vai continuar mantendo o veículo?
                      </legend>
                      <div className="mt-2 flex flex-wrap gap-4">
                        {[
                          { v: true, label: "Sim, vou manter" },
                          { v: false, label: "Não, vou deixar de manter" },
                        ].map((o) => (
                          <label key={String(o.v)} className="flex items-center gap-2 text-sm text-ink">
                            <input
                              type="radio"
                              name="keepsVehicle"
                              className="h-4 w-4 accent-[var(--color-action,currentColor)]"
                              checked={keepsVehicle === o.v}
                              onChange={() => setKeepsVehicle(o.v)}
                            />
                            {o.label}
                          </label>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Mantendo o veículo, os custos fixos continuam existindo e por isso <strong>não</strong> entram
                        como economia.
                      </p>
                      {errors.keepsVehicle && (
                        <p className="mt-2 text-xs font-semibold text-destructive">{errors.keepsVehicle}</p>
                      )}
                    </fieldset>
                  </>
                )}
                {modal === "uber" && (
                  <Field
                    name="ridePerKm"
                    label="Custo médio por km no aplicativo"
                    value={ridePerKm}
                    onChange={setRidePerKm}
                    suffix="R$/km"
                    error={errors.ridePerKm}
                  />
                )}
                {modal === "transporte_publico" && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      name="fare"
                      label="Tarifa por embarque"
                      value={fare}
                      onChange={setFare}
                      suffix="R$"
                      error={errors.fare}
                    />
                    <Field
                      name="tripsPerDay"
                      label="Embarques por dia"
                      value={tripsPerDay}
                      onChange={setTripsPerDay}
                      suffix="embarques"
                      step="1"
                      error={errors.tripsPerDay}
                    />
                  </div>
                )}
                {modal === "misto" && (
                  <Field
                    name="mixedSpend"
                    label="Gasto mensal variável com transporte"
                    value={mixedSpend}
                    onChange={setMixedSpend}
                    suffix="R$/mês"
                    help="Some só o que varia com o uso (combustível, corridas, passagens) e que você pretende substituir. Não inclua custo fixo de carro ou moto que você vai continuar mantendo: ele não deixa de existir."
                    error={errors.mixedSpend}
                  />
                )}

                <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                  <p className="text-sm font-bold text-ink">Custos da bike elétrica</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Não estimamos nada por você: informe os valores que considera reais. O preço da bike não entra
                    nesta conta (tempo de retorno virá em outra ferramenta).
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      name="energyPerKm"
                      label="Energia por km"
                      value={energyPerKm}
                      onChange={setEnergyPerKm}
                      suffix="R$/km"
                      step="0.001"
                      error={errors.energyPerKm}
                    />
                    <Field
                      name="maintenance"
                      label="Manutenção por mês"
                      value={maintenance}
                      onChange={setMaintenance}
                      suffix="R$/mês"
                      help="Digite 0 se você não prevê esse custo."
                      error={errors.maintenance}
                    />
                  </div>
                </div>

                <div className="rounded-2xl bg-surface p-4 ring-1 ring-line">
                  <p className="text-sm font-bold text-ink">Para sugerir modelos compatíveis (opcional)</p>
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={needsPassenger}
                        onChange={(e) => setNeedsPassenger(e.target.checked)}
                        className="h-4 w-4"
                      />
                      Preciso levar garupa
                    </label>
                    <Field
                      name="maxBudget"
                      label="Orçamento máximo"
                      value={maxBudget}
                      onChange={setMaxBudget}
                      suffix="R$"
                      help="Deixe em branco se não quiser filtrar por preço. Se preencher, use um valor real — não tratamos valor inválido como 'sem limite'."
                      error={errors.maxBudget}
                    />
                  </div>
                </div>
              </div>
            )}

            {step === 2 && result && (
              <div className="mt-6">
                {!result.ok ? (
                  <div className="rounded-2xl bg-destructive/10 p-4 text-sm text-destructive">
                    <p className="font-bold">Não foi possível calcular com esses dados:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {result.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="rounded-2xl bg-mint/20 p-5">
                      <p className="text-sm font-semibold text-ink">
                        {result.data.monthlySavings > 0
                          ? "Economia estimada por mês"
                          : result.data.monthlySavings === 0
                            ? "Diferença estimada por mês"
                            : "Custo adicional estimado por mês"}
                      </p>
                      <p className="mt-1 text-4xl font-black text-ink">{brl(result.data.monthlySavings)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Em 12 meses: <strong className="text-ink">{brl(result.data.annualSavings)}</strong>
                      </p>
                      {result.data.monthlySavings <= 0 && (
                        <p className="mt-2 text-sm text-ink">
                          Com as premissas que você informou, a troca não gera economia. Preferimos mostrar isso a
                          inventar um número positivo.
                        </p>
                      )}
                    </div>

                    <dl className="grid gap-2 text-sm">
                      {[
                        ["Dias no mês (52/12 semanas)", `${dec(result.data.monthlyDays)} dias`],
                        ["Km no mês", `${dec(result.data.monthlyKm)} km`],
                        ["Km substituídos pela bike", `${dec(result.data.replacedKm)} km`],
                        ["Custo variável substituído", brl(result.data.currentVariableReplaced)],
                        ["Custos fixos deixados de pagar", brl(result.data.currentFixedRemoved)],
                        ["Energia da bike", brl(result.data.bikeEnergyCost)],
                        ["Manutenção da bike", brl(result.data.bikeMaintenanceCost)],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-4 border-b border-line pb-2">
                          <dt className="text-muted-foreground">{k}</dt>
                          <dd className="font-semibold text-ink">{v}</dd>
                        </div>
                      ))}
                    </dl>

                    {result.data.fixedExcludedBecauseVehicleKept && (
                      <p className="rounded-xl bg-surface p-3 text-xs text-muted-foreground ring-1 ring-line">
                        Você informou que vai manter o veículo, então os custos fixos ficaram fora da economia.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {step > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface px-5 font-bold text-ink ring-1 ring-line"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar
                </button>
              )}
              {step < 2 && (
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-action px-5 font-bold text-primary-foreground hover:opacity-90"
                >
                  {step === 0 ? "Continuar" : "Ver o resultado"} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
              {step === 2 && (
                <button
                  type="button"
                  onClick={() => { setErrors({}); setStep(0); }}
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-surface px-5 font-bold text-ink ring-1 ring-line"
                >
                  Refazer o cenário
                </button>
              )}
            </div>
          </section>

          {/* ---------- Resultado + conteúdo explicativo (SSR) ---------- */}
          <div className="space-y-8">
            {step === 2 && result?.ok && (
              <section aria-labelledby="bikes" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-7">
                <h2 id="bikes" className="section-h2 text-ink">Bikes mais compatíveis com seu cenário</h2>
                {!sourceOk ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Não conseguimos ler o catálogo agora, então não mostramos modelo nenhum. Tente de novo mais tarde ou
                    veja o{" "}
                    <Link to="/bikes" className="font-semibold text-action underline underline-offset-2">
                      catálogo completo
                    </Link>
                    .
                  </p>
                ) : !hasReplacement ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Você informou que 0% do trajeto seria feito de bike, então não há cenário de uso para comparar
                    modelos.
                  </p>
                ) : recommendation && !recommendation.ok ? (
                  <div className="mt-3 rounded-2xl bg-destructive/10 p-4 text-sm text-destructive" role="alert">
                    <p className="font-bold">Corrija os dados abaixo para ver modelos compatíveis:</p>
                    <ul className="mt-2 list-disc space-y-1 pl-5">
                      {recommendation.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                ) : !recommendation || recommendation.bikes.length === 0 ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Nenhum modelo com oferta ativa atende à sua distância diária com margem de segurança
                    {needsPassenger ? ", capacidade para garupa" : ""}
                    {maxBudget.trim() !== "" ? " e orçamento informado" : ""}. Não afrouxamos os critérios para mostrar
                    alguma coisa.{" "}
                    <Link to="/bikes" className="font-semibold text-action underline underline-offset-2">
                      Ver o catálogo completo
                    </Link>
                  </p>
                ) : (
                  <>
                    <p className="mt-2 text-xs text-muted-foreground">{ORDER_CRITERION}</p>
                    <ul className="mt-5 space-y-4">
                      {recommendation.bikes.map((b) => (
                        <li key={b.bikeId} className="overflow-hidden rounded-2xl bg-surface ring-1 ring-line">
                          <BikeMedia src={b.image} name={b.name} className="h-40" />
                          <div className="p-4">
                            <h3 className="font-bold text-ink">{b.name}</h3>
                            <p className="mt-1 text-lg font-black text-ink">{brl(b.price)}</p>
                            <p className="text-xs text-muted-foreground">
                              Preço da oferta atual registrada pela Vitale no Mercado Livre.
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Autonomia {b.autonomyKm} km
                              {b.capacity ? ` · capacidade ${b.capacity} pessoa${b.capacity > 1 ? "s" : ""}` : ""}
                            </p>
                            <p className="mt-2 text-sm text-ink">{b.reason}</p>
                            <div className="mt-4 flex flex-col gap-2">
                              <a
                                href={b.link}
                                target="_blank"
                                rel="noopener noreferrer sponsored"
                                onClick={() => trackAffiliateClick({ bike_id: b.bikeId, position: "calculadora_economia" })}
                                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-4 font-bold text-primary-foreground hover:opacity-90"
                              >
                                Ver no Mercado Livre <ExternalLink className="h-4 w-4" aria-hidden="true" />
                              </a>
                              <div className="flex flex-wrap gap-3 text-sm font-semibold text-action">
                                <Link to="/bikes/$slug" params={{ slug: b.slug }} className="underline underline-offset-2">
                                  <Bike className="mr-1 inline h-4 w-4" aria-hidden="true" />
                                  Ficha da bike
                                </Link>
                                {b.monitored && (
                                  <Link to="/radar/$bikeId" params={{ bikeId: b.bikeId }} className="underline underline-offset-2">
                                    <LineChart className="mr-1 inline h-4 w-4" aria-hidden="true" />
                                    Histórico no Radar
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            )}

            <section aria-labelledby="como" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-7">
              <h2 id="como" className="section-h2 text-ink">Como calculamos</h2>
              <div className="mt-4 space-y-4 text-sm leading-relaxed text-muted-foreground">
                <div>
                  <p className="font-bold text-ink">As fórmulas</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>Dias no mês = dias por semana × {dec(WEEKS_PER_MONTH, 4)} (52 semanas ÷ 12 meses)</li>
                    <li>Km no mês = distância por dia × dias no mês</li>
                    <li>Km substituídos = km no mês × percentual substituível</li>
                    <li>Custo atual substituído = custo variável proporcional (+ custos fixos apenas se você deixar de manter o veículo)</li>
                    <li>Custo da bike = km substituídos × energia por km + manutenção mensal</li>
                    <li>Economia mensal = custo atual substituído − custo da bike; economia anual = mensal × 12</li>
                  </ul>
                </div>
                <div>
                  <p className="font-bold text-ink">O que entra e o que não entra</p>
                  <p className="mt-2">
                    Entram apenas os valores que você informa — nenhum campo vem preenchido com número nosso.
                    No modal misto, some só gastos variáveis: custo fixo de carro ou moto que você continuará mantendo
                    não deve entrar no valor substituível, porque ele não deixa de existir. Não entram: preço de compra da bike e sua amortização,
                    financiamento, seguro da bike, depreciação do veículo, valor do seu tempo e imprevistos. Se você
                    mantém carro ou moto, os custos fixos deles não viram economia — só somem se o veículo sair da sua
                    vida.
                  </p>
                </div>
                <div>
                  <p className="font-bold text-ink">Limite da estimativa</p>
                  <p className="mt-2">
                    O resultado é uma projeção aritmética do cenário que você descreveu, não uma promessa. Consumo real,
                    trânsito, clima e hábitos mudam o número. Quando a conta dá zero ou negativa, mostramos assim mesmo.
                  </p>
                </div>
                <div>
                  <p className="font-bold text-ink">Recência das ofertas</p>
                  <p className="mt-2">
                    Os preços dos modelos sugeridos são os da oferta atual registrada pela Vitale no Mercado Livre, lida
                    no momento em que esta página carregou; o preço final é sempre o do anúncio. Só sugerimos modelos com
                    autonomia declarada de pelo menos {Math.round((AUTONOMY_SAFETY_MARGIN - 1) * 100)}% acima da sua
                    distância diária e com link de oferta ativo.
                  </p>
                </div>
                <p className="text-xs">
                  A calculadora não guarda nem envia nome, e-mail ou telefone. Nada do que você digita sai do seu
                  navegador.
                </p>
              </div>
            </section>

            <section aria-labelledby="proximos" className="rounded-3xl bg-card p-5 ring-1 ring-line sm:p-7">
              <h2 id="proximos" className="section-h2 text-ink">Próximos passos</h2>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link to="/escolherbike" className="font-semibold text-action underline underline-offset-2">
                    Fazer o quiz de perfil
                  </Link>{" "}
                  <span className="text-muted-foreground">para chegar ao modelo certo pelo seu uso.</span>
                </li>
                <li>
                  <Link to="/radar" className="font-semibold text-action underline underline-offset-2">
                    Abrir o Radar de preços
                  </Link>{" "}
                  <span className="text-muted-foreground">para ver o histórico observado antes de comprar.</span>
                </li>
                <li>
                  <Link to="/ferramentas" className="font-semibold text-action underline underline-offset-2">
                    Ver todas as ferramentas
                  </Link>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
