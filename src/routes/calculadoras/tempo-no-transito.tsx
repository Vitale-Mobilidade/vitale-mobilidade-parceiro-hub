import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock } from "lucide-react";
import { BudgetSelector, NumberField, HillsToggle, PassengerToggle } from "@/components/mobility/calculator-ui";
import {
  BikeComparison,
  BikeScenarioCard,
  CalculatorResultHero,
  QuizCtaBanner,
  RadarCta,
  RelatedContent,
  RelatedTools,
  TimeBenefitChart,
} from "@/components/mobility/time-decision-ui";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { decimal, parseNumber, resolveBudget, validateNumber, type BudgetMode } from "@/lib/mobility/format";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import { AUTONOMY_SAFETY_MARGIN, LIMITS, WEEKS_PER_YEAR } from "@/lib/mobility/config";
import { computeMobilityTime, computeTimeProjection } from "@/lib/mobility/time-engine";
import { recommendScenarioPair, type MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { safeVideos, type VideoCard } from "@/lib/videos.functions";
import { canonicalUrl, pageHead } from "@/lib/seo";

const PATH = "/calculadoras/tempo-no-transito";
const TITLE = "Quanto tempo você passa no trânsito por ano? Compare com bike | Vitale Mobilidade";
const DESCRIPTION =
  "Veja quantas horas e dias por ano você passa no trajeto hoje e quanto isso mudaria fazendo os mesmos trajetos de bike, com projeção de 1, 3 e 5 anos.";

export const Route = createFileRoute("/calculadoras/tempo-no-transito")({
  loader: () => getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      path: PATH,
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Quanto tempo você passa no trânsito por ano?",
      ogDescription: "Horas no trajeto hoje e de bike, com seus próprios tempos, sem cadastro.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora de tempo no trânsito",
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
  component: TempoNoTransito,
});

function TempoNoTransito() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  const [outboundMinutes, setOutboundMinutes] = useState("");
  const [returnMinutes, setReturnMinutes] = useState("");
  const [bikeMinutes, setBikeMinutes] = useState("");
  const [daysPerWeek, setDaysPerWeek] = useState("");
  const [dailyKm, setDailyKm] = useState("");
  const [weeksPerYear, setWeeksPerYear] = useState(String(WEEKS_PER_YEAR));
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("none");
  const [customBudget, setCustomBudget] = useState("");
  const [needsPassenger, setNeedsPassenger] = useState(false);
  const [needsHills, setNeedsHills] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [relatedVideos, setRelatedVideos] = useState<VideoCard[]>([]);

  const errors = {
    outboundMinutes: validateNumber(outboundMinutes, "Minutos de ida", LIMITS.minutesPerDay),
    returnMinutes: validateNumber(returnMinutes, "Minutos de volta", LIMITS.minutesPerDay),
    bikeMinutes: validateNumber(bikeMinutes, "Tempo de bike", LIMITS.minutesPerDay),
    daysPerWeek: validateNumber(daysPerWeek, "Dias por semana", LIMITS.daysPerWeek),
    dailyKm: dailyKm.trim() === "" ? null : validateNumber(dailyKm, "Km por dia", LIMITS.dailyKm),
    weeksPerYear: validateNumber(weeksPerYear, "Semanas por ano", LIMITS.weeksPerYear),
    budget: budgetMode === "custom" ? validateNumber(customBudget, "Orçamento", LIMITS.budget) : null,
  };
  const mark = (n: string) => setTouched((c) => ({ ...c, [n]: true }));
  const err = (n: keyof typeof errors) => (touched[n] ? errors[n] : null);

  const ready =
    !errors.outboundMinutes &&
    !errors.returnMinutes &&
    !errors.bikeMinutes &&
    !errors.daysPerWeek &&
    !errors.weeksPerYear;
  const time = useMemo(() => {
    if (!ready) return null;
    const r = computeMobilityTime({
      // Adaptador: ida + volta informadas separadamente viram o total diário do motor.
      currentMinutesPerDay: parseNumber(outboundMinutes) + parseNumber(returnMinutes),
      bikeMinutesPerDay: parseNumber(bikeMinutes),
      daysPerWeek: parseNumber(daysPerWeek),
      weeksPerYear: parseNumber(weeksPerYear),
    });
    return r.ok ? r.data : null;
  }, [ready, outboundMinutes, returnMinutes, bikeMinutes, daysPerWeek, weeksPerYear]);
  const projection = time ? computeTimeProjection(time) : [];

  const km = dailyKm.trim() === "" || errors.dailyKm ? null : parseNumber(dailyKm);
  const budget = resolveBudget(budgetMode, customBudget);
  const recommendations = useMemo(() => {
    if (!time || km === null || km <= 0 || !sourceOk || errors.budget) return null;
    return recommendScenarioPair(candidates, { dailyKm: km, needsPassenger, needsHills, maxBudget: budget });
  }, [time, km, sourceOk, errors.budget, candidates, needsPassenger, needsHills, budget]);
  const bikes = recommendations?.ok ? recommendations.bikes : [];
  const relatedBikeIds = bikes.map((bike) => bike.bikeId).join(",");
  useEffect(() => {
    let active = true;
    const ids = relatedBikeIds.split(",").filter(Boolean).slice(0, 2);
    if (!ids.length) {
      setRelatedVideos([]);
      return () => {
        active = false;
      };
    }
    Promise.all(ids.map((bikeId) => safeVideos({ bikeId, limit: 2 }))).then((lists) => {
      if (!active) return;
      const unique = new Map(lists.flat().map((video) => [video.videoId, video]));
      setRelatedVideos([...unique.values()].slice(0, 4));
    });
    return () => {
      active = false;
    };
  }, [relatedBikeIds]);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-6 sm:py-8">
            <p className="text-xs font-bold tracking-[0.2em] text-mint">TEMPO NO TRÂNSITO</p>
            <h1 className="mt-2 max-w-4xl text-3xl font-black leading-tight sm:text-4xl">
              Quanto tempo você passa no trânsito por ano?
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-foreground/80 sm:text-base">
              Informe seu tempo de trajeto hoje e sua estimativa de bike. O resultado aparece na hora, sem cadastro.
            </p>
          </div>
        </section>

        <div className="responsive-container space-y-8 py-7 sm:py-10">
          <section aria-labelledby="simulacao" className="space-y-6">
            <div className="rounded-2xl bg-card p-5 ring-1 ring-line sm:p-7">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-mint/25 text-action">
                  <Clock className="h-5 w-5" aria-hidden="true" />
                </span>
                <div>
                  <h2 id="simulacao" className="text-2xl font-black text-ink">
                    Seu trajeto
                  </h2>
                  <p className="text-sm text-muted-foreground">Use seus próprios tempos; não estimamos velocidade.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="md:col-span-2 xl:col-span-2 grid gap-4 sm:grid-cols-2">
                  <NumberField
                    name="outboundMinutes"
                    label="Minutos de ida hoje"
                    value={outboundMinutes}
                    onChange={setOutboundMinutes}
                    onBlur={() => mark("outboundMinutes")}
                    suffix="min"
                    step="1"
                    help="Incluindo espera."
                    error={err("outboundMinutes")}
                  />
                  <NumberField
                    name="returnMinutes"
                    label="Minutos de volta hoje"
                    value={returnMinutes}
                    onChange={setReturnMinutes}
                    onBlur={() => mark("returnMinutes")}
                    suffix="min"
                    step="1"
                    help="Incluindo espera."
                    error={err("returnMinutes")}
                  />
                </div>
                <NumberField
                  name="bikeMinutes"
                  label="Minutos de bike por dia (ida + volta)"
                  value={bikeMinutes}
                  onChange={setBikeMinutes}
                  onBlur={() => mark("bikeMinutes")}
                  suffix="min"
                  step="1"
                  help="Sua estimativa total para os mesmos trajetos."
                  error={err("bikeMinutes")}
                />
                <div className="grid gap-4 sm:grid-cols-2 md:col-span-2 xl:col-span-1">
                  <NumberField
                    name="daysPerWeek"
                    label="Dias por semana"
                    value={daysPerWeek}
                    onChange={setDaysPerWeek}
                    onBlur={() => mark("daysPerWeek")}
                    suffix="dias"
                    step="1"
                    error={err("daysPerWeek")}
                  />
                  <NumberField
                    name="dailyKm"
                    label="Km por dia (opcional)"
                    value={dailyKm}
                    onChange={setDailyKm}
                    onBlur={() => mark("dailyKm")}
                    suffix="km"
                    step="0.1"
                    help="Só para sugerir bikes com autonomia suficiente."
                    error={err("dailyKm")}
                  />
                </div>
              </div>
            </div>

            <section aria-labelledby="resultado" aria-live="polite">
              <h2 id="resultado" className="sr-only">
                Resultado do seu trajeto
              </h2>
              {!time ? (
                <div className="grid min-h-36 place-items-center rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
                  <div className="max-w-sm">
                    <Clock className="mx-auto h-9 w-9 text-action" aria-hidden="true" />
                    <p className="mt-3 font-bold text-ink">Preencha seus tempos para começar</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Nenhum resultado aparece até os campos obrigatórios serem válidos.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <CalculatorResultHero result={time} />
                  <TimeBenefitChart points={projection} />
                  <p className="text-xs text-muted-foreground">
                    Estimativa com {decimal(time.daysPerYear)} dias de trajeto por ano. Ajuste a premissa de semanas em
                    “Como calculamos?”.
                  </p>
                </div>
              )}
            </section>
          </section>

          {time && (
            <section aria-labelledby="bikes" className="space-y-5">
              <div className="max-w-3xl">
                <h2 id="bikes" className="text-3xl font-black text-ink">
                  Bikes para considerar no seu trajeto
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  Selecionamos modelos com oferta ativa e autonomia declarada compatível com a distância informada. Esta
                  ferramenta não calcula economia financeira nem prevê o tempo de cada modelo.
                </p>
              </div>
              <div className="grid gap-4 rounded-xl bg-surface p-4 ring-1 ring-line lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <BudgetSelector
                  mode={budgetMode}
                  onModeChange={setBudgetMode}
                  custom={customBudget}
                  onCustomChange={setCustomBudget}
                  onTouched={() => mark("budget")}
                  error={err("budget")}
                />
                <PassengerToggle checked={needsPassenger} onChange={setNeedsPassenger} />
                <HillsToggle checked={needsHills} onChange={setNeedsHills} />
              </div>
              {km === null || km <= 0 ? (
                <p className="rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">
                  Informe os km por dia para vermos quais bikes têm autonomia suficiente. Sem essa informação, não
                  sugerimos modelos.
                </p>
              ) : !sourceOk ? (
                <p className="rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">
                  Não conseguimos ler as ofertas atuais agora. Nenhum modelo ou preço foi preenchido por alternativa.
                </p>
              ) : recommendations && !recommendations.ok ? (
                <div role="alert" className="rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  {recommendations.errors.join(" ")}
                </div>
              ) : errors.budget ? (
                <p className="rounded-md bg-surface p-4 text-sm text-muted-foreground ring-1 ring-line">
                  Corrija o orçamento para ver as bikes compatíveis.
                </p>
              ) : bikes.length === 0 ? (
                <div className="rounded-xl bg-surface p-5 text-sm text-ink ring-1 ring-line">
                  <p className="font-bold">Não encontramos uma bike que atenda a todos os filtros atuais.</p>
                  <p className="mt-2 text-muted-foreground">
                    Você pode ajustar o teto de preço, garupa ou subidas acima, explorar todas as bikes ou fazer o Quiz.
                    A margem de autonomia não é afrouxada automaticamente.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4">
                    <Link to="/bikes" className="font-bold text-action underline">
                      Ver todas as bikes
                    </Link>
                    <Link to="/escolherbike" className="font-bold text-action underline">
                      Fazer o Quiz
                    </Link>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid gap-5 lg:grid-cols-2">
                    {bikes.map((bike) => (
                      <BikeScenarioCard
                        key={bike.bikeId}
                        bike={bike}
                        dailyKm={km}
                        position="calculadora_tempo_no_transito"
                      />
                    ))}
                  </div>
                  <BikeComparison bikes={bikes} />
                  {bikes.length === 1 && (
                    <p className="text-sm text-muted-foreground">
                      Só um modelo passou por todos os filtros atuais. Não mostramos uma segunda bike incompatível
                      apenas para completar o par.
                    </p>
                  )}
                  <RadarCta />
                </>
              )}
            </section>
          )}

          {time && <QuizCtaBanner />}
          {time && <RelatedContent videos={relatedVideos} />}
          {time && <RelatedTools />}

          <details className="rounded-lg bg-card p-5 ring-1 ring-line sm:p-7">
            <summary className="min-h-11 cursor-pointer text-xl font-black text-ink">Como calculamos?</summary>
            <div className="mt-5 grid gap-6 text-sm leading-relaxed text-muted-foreground lg:grid-cols-2">
              <div>
                <h2 className="font-bold text-ink">Tempo</h2>
                <ul className="mt-2 list-disc space-y-2 pl-5">
                  <li>Dias por ano = dias/semana × semanas/ano.</li>
                  <li>Minutos por dia hoje = ida + volta informadas.</li>
                  <li>Horas por ano = minutos por dia × dias por ano ÷ 60 (hoje e de bike).</li>
                  <li>Diferença = horas de hoje − horas de bike. Negativa = a bike demora mais.</li>
                  <li>Projeção de 1, 3 e 5 anos = horas por ano × anos, sem outros ajustes.</li>
                  <li>Os tempos são os que você informou: não usamos mapas, velocidade presumida nem IA.</li>
                </ul>
                <div className="mt-4 max-w-xs">
                  <NumberField
                    name="weeksPerYear"
                    label="Semanas por ano consideradas"
                    value={weeksPerYear}
                    onChange={setWeeksPerYear}
                    onBlur={() => mark("weeksPerYear")}
                    suffix="sem"
                    step="1"
                    help={`Premissa central: ${WEEKS_PER_YEAR}. Reduza para descontar férias.`}
                    error={err("weeksPerYear")}
                  />
                </div>
              </div>
              <div>
                <h2 className="font-bold text-ink">Bikes sugeridas</h2>
                <p className="mt-2">
                  Só com km por dia informado. Entram bikes elegíveis, ativas, com preço positivo, link meli.la válido e
                  autonomia declarada com margem de {Math.round((AUTONOMY_SAFETY_MARGIN - 1) * 100)}%. Garupa, subidas e
                  orçamento são filtros rígidos. A primeira é a oferta compatível de menor preço; quando existe outra,
                  mostramos a de maior autonomia declarada entre as restantes. Se houver apenas uma compatível,
                  mostramos uma só. Os preços vêm da oferta atual; o status do Radar só aparece se o preço monitorado
                  corresponder ao mesmo preço comercial. Nenhum valor financeiro é calculado aqui. Nenhum nome, e-mail
                  ou telefone é coletado.
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
