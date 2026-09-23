import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { TimeProjectionChart } from "@/components/mobility/TimeProjectionChart";
import { BikeResultCard, BudgetSelector, Metric, NumberField, PassengerToggle } from "@/components/mobility/calculator-ui";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { decimal, parseNumber, resolveBudget, validateNumber, type BudgetMode } from "@/lib/mobility/format";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import { AUTONOMY_SAFETY_MARGIN, LIMITS, WEEKS_PER_YEAR } from "@/lib/mobility/config";
import { computeMobilityTime, computeTimeProjection } from "@/lib/mobility/time-engine";
import { QUICK_ORDER_CRITERION, recommendQuickComparison, type MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { canonicalUrl, pageHead } from "@/lib/seo";

const PATH = "/calculadoras/tempo-recuperado";
const TITLE = "Quanto tempo uma bike elétrica devolve por mês e por ano? | Vitale Mobilidade";
const DESCRIPTION =
  "Compare seu tempo diário de trajeto hoje com sua estimativa de bike e veja as horas recuperadas (ou adicionais) por mês, ano, 3 e 5 anos.";

export const Route = createFileRoute("/calculadoras/tempo-recuperado")({
  loader: () =>
    getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Quanto tempo a bike elétrica devolve por ano?",
      ogDescription: "Horas recuperadas com seus próprios tempos, sem cadastro.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora de tempo recuperado com bike",
            url: canonicalUrl(PATH),
            applicationCategory: "UtilitiesApplication",
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
  component: TempoRecuperado,
});

const hours = (h: number) => `${decimal(Math.abs(h))} h`;

function TempoRecuperado() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  const [currentMinutes, setCurrentMinutes] = useState("");
  const [bikeMinutes, setBikeMinutes] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [dailyKm, setDailyKm] = useState("");
  const [weeksPerYear, setWeeksPerYear] = useState(String(WEEKS_PER_YEAR));
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("none");
  const [customBudget, setCustomBudget] = useState("");
  const [needsPassenger, setNeedsPassenger] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const errors = {
    currentMinutes: validateNumber(currentMinutes, "Tempo atual", LIMITS.minutesPerDay),
    bikeMinutes: validateNumber(bikeMinutes, "Tempo de bike", LIMITS.minutesPerDay),
    daysPerWeek: validateNumber(daysPerWeek, "Dias por semana", LIMITS.daysPerWeek),
    dailyKm: dailyKm.trim() === "" ? null : validateNumber(dailyKm, "Km por dia", LIMITS.dailyKm),
    weeksPerYear: validateNumber(weeksPerYear, "Semanas por ano", LIMITS.weeksPerYear),
    budget: budgetMode === "custom" ? validateNumber(customBudget, "Orçamento", LIMITS.budget) : null,
  };
  const mark = (n: string) => setTouched((c) => ({ ...c, [n]: true }));
  const err = (n: keyof typeof errors) => (touched[n] ? errors[n] : null);

  const ready = !errors.currentMinutes && !errors.bikeMinutes && !errors.daysPerWeek && !errors.weeksPerYear;
  const time = useMemo(() => {
    if (!ready) return null;
    const r = computeMobilityTime({
      currentMinutesPerDay: parseNumber(currentMinutes),
      bikeMinutesPerDay: parseNumber(bikeMinutes),
      daysPerWeek: parseNumber(daysPerWeek),
      weeksPerYear: parseNumber(weeksPerYear),
    });
    return r.ok ? r.data : null;
  }, [ready, currentMinutes, bikeMinutes, daysPerWeek, weeksPerYear]);
  const projection = time ? computeTimeProjection(time) : [];

  const km = dailyKm.trim() === "" || errors.dailyKm ? null : parseNumber(dailyKm);
  const budget = resolveBudget(budgetMode, customBudget);
  const recommendations = useMemo(() => {
    if (!time || km === null || km <= 0 || !sourceOk || errors.budget) return null;
    return recommendQuickComparison(candidates, { dailyKm: km, needsPassenger, maxBudget: budget });
  }, [time, km, sourceOk, errors.budget, candidates, needsPassenger, budget]);
  const bikes = recommendations?.ok ? recommendations.bikes : [];

  const saved = time?.savedHoursPerYear ?? 0;
  const weeks = parseNumber(weeksPerYear);
  const savedPerWeek = time && weeks > 0 ? saved / weeks : 0;
  const label = (period: string) => `${saved >= 0 ? "Horas recuperadas" : "Tempo adicional"} por ${period}`;
  const insight = !time
    ? null
    : saved > 0
      ? `Com os tempos que você informou, a bike devolveria cerca de ${hours(saved)} por ano (${decimal(time.savedWorkdaysPerYear)} jornadas de 8 h).`
      : saved < 0
        ? `Com os tempos que você informou, a bike levaria ${hours(saved)} a mais por ano. Nesse trajeto, o ganho com bike não é de tempo.`
        : "Com os tempos que você informou, o tempo no trajeto seria o mesmo de bike.";

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-6 sm:py-8">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">TEMPO RECUPERADO</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">Quanto tempo a bike elétrica devolve por mês e por ano?</h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
              Informe seu tempo de trajeto hoje e sua estimativa de bike. O resultado aparece na hora, sem cadastro.
            </p>
          </div>
        </section>

        <div className="responsive-container space-y-8 py-7 sm:py-10">
          <section aria-labelledby="simulacao" className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <div className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-mint/25 text-action"><Clock className="h-5 w-5" aria-hidden="true" /></span>
                <div>
                  <h2 id="simulacao" className="text-2xl font-black text-ink">Seu trajeto</h2>
                  <p className="text-sm text-muted-foreground">Use seus próprios tempos; não estimamos velocidade.</p>
                </div>
              </div>
              <div className="mt-6 space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField name="currentMinutes" label="Tempo atual por dia (ida + volta)" value={currentMinutes} onChange={setCurrentMinutes} onBlur={() => mark("currentMinutes")} suffix="min" step="1" help="Incluindo espera." error={err("currentMinutes")} />
                  <NumberField name="bikeMinutes" label="Tempo de bike por dia (ida + volta)" value={bikeMinutes} onChange={setBikeMinutes} onBlur={() => mark("bikeMinutes")} suffix="min" step="1" help="Sua estimativa para os mesmos trajetos." error={err("bikeMinutes")} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <NumberField name="daysPerWeek" label="Dias por semana" value={daysPerWeek} onChange={setDaysPerWeek} onBlur={() => mark("daysPerWeek")} suffix="dias" step="1" error={err("daysPerWeek")} />
                  <NumberField name="dailyKm" label="Km por dia (opcional)" value={dailyKm} onChange={setDailyKm} onBlur={() => mark("dailyKm")} suffix="km" step="0.1" help="Só para sugerir bikes com autonomia suficiente." error={err("dailyKm")} />
                </div>
                <details className="rounded-md bg-surface p-3 ring-1 ring-line">
                  <summary className="min-h-11 cursor-pointer text-sm font-bold text-ink">Filtrar bikes por orçamento e garupa (opcional)</summary>
                  <div className="mt-3 space-y-4">
                    <BudgetSelector mode={budgetMode} onModeChange={setBudgetMode} custom={customBudget} onCustomChange={setCustomBudget} onTouched={() => mark("budget")} error={err("budget")} />
                    <PassengerToggle checked={needsPassenger} onChange={setNeedsPassenger} />
                  </div>
                </details>
              </div>
            </div>

            <section aria-labelledby="resultado" aria-live="polite" className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-6">
              <h2 id="resultado" className="text-2xl font-black text-ink">Tempo recuperado</h2>
              {!time ? (
                <div className="mt-5 grid min-h-48 place-items-center rounded-md bg-surface p-6 text-center ring-1 ring-line">
                  <div className="max-w-sm">
                    <Clock className="mx-auto h-9 w-9 text-action" aria-hidden="true" />
                    <p className="mt-3 font-bold text-ink">Preencha seus tempos para começar</p>
                    <p className="mt-2 text-sm text-muted-foreground">Nenhum resultado aparece até os campos obrigatórios serem válidos.</p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 space-y-5">
                  <dl className="grid grid-cols-2 gap-3">
                    <Metric label={label("mês")} value={hours(saved / 12)} emphasis />
                    <Metric label={label("ano")} value={`${hours(saved)} · ${decimal(Math.abs(time.savedFullDaysPerYear))} dias`} emphasis />
                    <Metric label={label("3 anos")} value={hours(projection[1]?.savedHours ?? 0)} />
                    <Metric label={label("5 anos")} value={hours(projection[2]?.savedHours ?? 0)} />
                  </dl>
                  <p className={`rounded-md p-4 text-sm leading-relaxed ${saved > 0 ? "bg-mint/20 text-ink" : "bg-surface text-muted-foreground ring-1 ring-line"}`}>{insight}</p>
                  <p className="text-xs text-muted-foreground">Estimativa com {decimal(time.daysPerYear)} dias de trajeto por ano. "Dias" = blocos de 24 h.</p>
                  <TimeProjectionChart points={projection} />
                </div>
              )}
            </section>
          </section>

          {time && (
            <section aria-labelledby="bikes" className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
              <div className="max-w-3xl">
                <h2 id="bikes" className="text-2xl font-black text-ink">Bikes com autonomia para seu trajeto</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{QUICK_ORDER_CRITERION} Esta ferramenta não calcula economia financeira nem payback.</p>
              </div>
              {km === null || km <= 0 ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Informe os km por dia para vermos quais bikes têm autonomia suficiente. Sem essa informação, não sugerimos modelos.</p>
              ) : !sourceOk ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Não conseguimos ler as ofertas atuais agora. Nenhum modelo ou preço foi preenchido por alternativa.</p>
              ) : recommendations && !recommendations.ok ? (
                <div role="alert" className="mt-5 rounded-md bg-destructive/10 p-4 text-sm text-destructive">{recommendations.errors.join(" ")}</div>
              ) : errors.budget ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Corrija o orçamento para ver as bikes compatíveis.</p>
              ) : bikes.length === 0 ? (
                <p className="mt-5 rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">Nenhuma bike com oferta atual atende à distância, margem de autonomia, garupa e orçamento informados. Não afrouxamos os filtros.</p>
              ) : (
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  {bikes.map((bike) => (
                    <BikeResultCard key={bike.bikeId} bike={bike} selected={false} onSelect={() => {}} position="calculadora_tempo_recuperado" />
                  ))}
                </div>
              )}
            </section>
          )}

          <details className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
            <summary className="min-h-11 cursor-pointer text-xl font-black text-ink">Como calculamos?</summary>
            <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
              <div>
                <h2 className="font-bold text-ink">Tempo</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Dias por ano = dias/semana × semanas/ano.</li>
                  <li>Horas por mês = horas por ano ÷ 12 (equivale a semanas/ano ÷ 12 semanas por mês; com 52, 4,33).</li>
                                    <li>Horas por ano = minutos por dia × dias por ano ÷ 60 (hoje e de bike).</li>
                  <li>Diferença = horas de hoje − horas de bike. Negativa = a bike demora mais.</li>
                  <li>Projeção de 1, 3 e 5 anos = horas por ano × anos, sem outros ajustes.</li>
                  <li>Os tempos são os que você informou: não usamos mapas, velocidade presumida nem IA.</li>
                </ul>
                <div className="mt-4 max-w-xs">
                  <NumberField name="weeksPerYear" label="Semanas por ano consideradas" value={weeksPerYear} onChange={setWeeksPerYear} onBlur={() => mark("weeksPerYear")} suffix="sem" step="1" help={`Premissa central: ${WEEKS_PER_YEAR}. Reduza para descontar férias.`} error={err("weeksPerYear")} />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-ink">Bikes sugeridas</h2>
                <p className="mt-2">Só com km por dia informado. Entram bikes elegíveis, ativas, com preço positivo, link meli.la válido e autonomia declarada com margem de {Math.round((AUTONOMY_SAFETY_MARGIN - 1) * 100)}%. Garupa e orçamento são filtros rígidos. Nenhum valor financeiro é calculado aqui. Nenhum nome, e-mail ou telefone é coletado.</p>
              </div>
            </div>
          </details>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
