import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, ExternalLink, Wrench } from "lucide-react";
import { BudgetSelector, HillsToggle, Metric, NumberField, PassengerToggle, RecommendationFooter, ResultHero } from "@/components/mobility/calculator-ui";
import { SiteFooter, SiteHeader, BikeMedia } from "@/components/site/site-ui";
import { QuizBanner } from "@/components/site/DecisionBanners";
import { Button } from "@/components/ui/button";
import { trackAffiliateClick, type AffiliatePosition } from "@/lib/affiliate-analytics";
import { LIMITS } from "@/lib/mobility/config";
import { brl, resolveBudget, validateNumber, type BudgetMode } from "@/lib/mobility/format";
import { recommendScenarioPair, type MobilityBikeCandidate, type RecommendedBike } from "@/lib/mobility/recommendation-engine";
import { readValues, TOOL_DEFINITIONS, type Choices, type ImpactLine, type Section } from "@/lib/mobility/tools-definitions";
import { getTool, type ToolSlug } from "@/lib/mobility/tools-registry";

export type ToolLoaderData = { ok: boolean; candidates: MobilityBikeCandidate[] };

const positionFor = (slug: ToolSlug) => `ferramenta_${slug.replace(/-/g, "_")}` as AffiliatePosition;

/**
 * Página comum das sete ferramentas. Hero, explicação, formulário inicial e "Como calculamos?" são SSR;
 * o resultado recalcula no cliente a cada alteração. Nenhum valor sai do navegador (sem URL, storage ou analytics).
 */
export function MobilityToolPage({ slug, data }: { slug: ToolSlug; data: ToolLoaderData }) {
  const tool = getTool(slug);
  const def = TOOL_DEFINITIONS[slug];
  const [choices, setChoices] = useState<Choices>(() => Object.fromEntries(def.choices.map((c) => [c.name, c.defaultValue])));
  const [raw, setRaw] = useState<Record<string, string>>(() => Object.fromEntries(def.fields.map((f) => [f.name, f.defaultValue ?? ""])));
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [budgetMode, setBudgetMode] = useState<BudgetMode>("none");
  const [customBudget, setCustomBudget] = useState("");
  const [budgetTouched, setBudgetTouched] = useState(false);
  const [passenger, setPassenger] = useState(false);
  const [hills, setHills] = useState(false);

  const read = useMemo(() => readValues(def, raw, choices), [def, raw, choices]);
  const result = useMemo(() => {
    if (read.missing.length || Object.keys(read.invalid).length) return null;
    return def.compute(read.values, choices);
  }, [def, read, choices]);

  const budgetError = budgetMode === "custom" ? validateNumber(customBudget, "Orçamento máximo", LIMITS.budget) : null;
  const maxBudget = def.usesBudget && !budgetError ? resolveBudget(budgetMode, customBudget) : null;
  const dailyKm = result?.ok ? result.data.dailyKm : 0;
  const recommendation = useMemo(() => {
    if (!data.ok || !(dailyKm > 0) || budgetError) return null;
    return recommendScenarioPair(data.candidates, { dailyKm, needsPassenger: passenger, maxBudget, needsHills: hills });
  }, [data, dailyKm, passenger, maxBudget, hills, budgetError]);
  const bikes = recommendation?.ok ? recommendation.bikes : [];

  const sectionFields = (s: Section) => def.fields.filter((f) => f.section === s && (!f.visible || f.visible(choices)));
  const related = tool.related.map(getTool);

  return (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="responsive-container py-12 sm:py-16">
            <nav aria-label="Trilha" className="text-sm text-ink-foreground/70">
              <Link to="/ferramentas" className="hover:underline">Ferramentas</Link> <span aria-hidden="true">/</span> {tool.title}
            </nav>
            <p className="mt-4 text-xs font-bold tracking-[0.2em] text-mint">{tool.eyebrow}</p>
            <h1 className="entry-h1 mt-3 max-w-3xl">{tool.h1}</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink-foreground/90">{tool.intro}</p>
            <p className="mt-3 text-sm text-ink-foreground/70">Simulação sem cadastro. Seus números ficam só neste navegador.</p>
          </div>
        </section>

        <div className="responsive-container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div role="group" aria-label="Dados da simulação" className="space-y-8 rounded-3xl bg-card p-5 ring-1 ring-line sm:p-8">
            {([1, 2, 3] as Section[]).map((s) => (
              <fieldset key={s} className="space-y-4">
                <legend className="text-lg font-black text-ink">{def.sectionTitles[s]}</legend>
                {def.choices.filter((c) => c.section === s).map((c) => (
                  <div key={c.name} role="radiogroup" aria-label={c.label}>
                    <p className="text-sm font-bold text-ink">{c.label}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {c.options.map((o) => (
                        <Button
                          key={o.value}
                          type="button"
                          role="radio"
                          aria-checked={choices[c.name] === o.value}
                          variant={choices[c.name] === o.value ? "default" : "outline"}
                          className={choices[c.name] === o.value ? "min-h-11 bg-action" : "min-h-11 border-line"}
                          onClick={() => setChoices((prev) => ({ ...prev, [c.name]: o.value }))}
                        >
                          {o.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="grid gap-4 sm:grid-cols-2">
                  {sectionFields(s).map((f) => (
                    <NumberField
                      key={f.name}
                      name={`${slug}-${f.name}`}
                      label={f.optional ? `${f.label} (opcional)` : f.label}
                      value={raw[f.name] ?? ""}
                      onChange={(value) => setRaw((prev) => ({ ...prev, [f.name]: value }))}
                      onBlur={() => setTouched((prev) => ({ ...prev, [f.name]: true }))}
                      suffix={f.suffix}
                      help={f.help}
                      step={f.step}
                      error={touched[f.name] ? read.invalid[f.name] ?? null : null}
                    />
                  ))}
                </div>
                {s === 3 && (
                  <div className="space-y-3">
                    {def.usesBudget && (
                      <BudgetSelector mode={budgetMode} onModeChange={setBudgetMode} custom={customBudget} onCustomChange={setCustomBudget} onTouched={() => setBudgetTouched(true)} error={budgetTouched ? budgetError : null} />
                    )}
                    <PassengerToggle checked={passenger} onChange={setPassenger} />
                    <HillsToggle checked={hills} onChange={setHills} />
                  </div>
                )}
              </fieldset>
            ))}
          </div>

          <section aria-labelledby="resultado" className="space-y-5 lg:sticky lg:top-24">
            <h2 id="resultado" className="section-h2 text-ink">Resultado</h2>
            <div aria-live="polite" className="space-y-4">
              {!result && Object.keys(read.invalid).length === 0 && (
                <div className="rounded-2xl bg-card p-6 text-muted-foreground ring-1 ring-line">
                  Preencha os campos obrigatórios para ver a simulação. Nenhum número é presumido além das premissas mostradas.
                </div>
              )}
              {!result && Object.keys(read.invalid).length > 0 && (
                <ul className="rounded-2xl bg-card p-6 text-sm font-semibold text-destructive ring-1 ring-destructive/40">
                  {Object.values(read.invalid).map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              {result && !result.ok && (
                <ul className="rounded-2xl bg-card p-6 text-sm font-semibold text-destructive ring-1 ring-destructive/40">
                  {result.errors.map((m) => <li key={m}>{m}</li>)}
                </ul>
              )}
              {result?.ok && (
                <>
                  <ResultHero {...result.data.hero} />
                  <dl className="grid gap-3 sm:grid-cols-2">
                    {result.data.metrics.map((m) => <Metric key={m.label} {...m} />)}
                  </dl>
                  {result.data.note && <p className="text-sm text-muted-foreground">{result.data.note}</p>}
                </>
              )}
            </div>
          </section>
        </div>

        {result?.ok && (
          <section aria-labelledby="bikes" className="responsive-container pb-10">
            <h2 id="bikes" className="section-h2 text-ink">Bikes para este cenário</h2>
            {!data.ok && <p className="mt-3 rounded-2xl bg-card p-5 text-muted-foreground ring-1 ring-line">As ofertas atuais estão indisponíveis agora. A simulação acima continua válida; tente de novo em instantes para ver bikes reais.</p>}
            {data.ok && recommendation && !recommendation.ok && <p className="mt-3 text-sm text-destructive">{recommendation.errors.join(" ")}</p>}
            {data.ok && recommendation?.ok && bikes.length === 0 && (
              <p className="mt-3 rounded-2xl bg-card p-5 text-muted-foreground ring-1 ring-line">
                Nenhuma bike com oferta atual cobre {result.data.dailyKm} km por dia com 20% de margem e os filtros escolhidos. Não afrouxamos os filtros: ajuste orçamento, garupa ou subidas, ou veja o Radar.
              </p>
            )}
            {bikes.length > 0 && (
              <div className="mt-5 grid gap-5 md:grid-cols-2">
                {bikes.map((b) => <ToolBikeCard key={b.bikeId} bike={b} impact={result.data.bikeImpact(b.price)} position={positionFor(slug)} />)}
              </div>
            )}
            {bikes.length > 0 && recommendation?.ok && (
              <RecommendationFooter budgetInformed={maxBudget !== null} eligibleCount={recommendation.eligibleCount ?? bikes.length} hillsRequested={hills} bikes={bikes} />
            )}
          </section>
        )}

        <div className="responsive-container space-y-10 pb-14">
          <details className="rounded-2xl bg-card p-6 ring-1 ring-line">
            <summary className="cursor-pointer text-lg font-black text-ink">Como calculamos?</summary>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
              {def.method.map((m) => <li key={m}>{m}</li>)}
            </ul>
          </details>

          {bikes.length === 0 && (
            <section aria-label="Próximos passos" className="space-y-4">
              <QuizBanner />
              <Link to="/radar" className="inline-flex min-h-11 items-center gap-2 font-bold text-action hover:underline">
                <BarChart3 className="h-4 w-4" aria-hidden="true" /> Explorar bikes e preços no Radar <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </section>
          )}

          <section aria-labelledby="relacionadas">
            <h2 id="relacionadas" className="section-h2 text-ink">Ferramentas relacionadas</h2>
            <ul className="mt-5 grid gap-4 md:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link to={r.path} className="group flex h-full flex-col rounded-2xl bg-card p-5 ring-1 ring-line hover:ring-action focus-visible:ring-2 focus-visible:ring-action">
                    <Wrench className="h-5 w-5 text-action" aria-hidden="true" />
                    <h3 className="mt-3 font-black text-ink group-hover:underline">{r.title}</h3>
                    <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.question}</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-action">{r.cta} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                  </Link>
                </li>
              ))}
            </ul>
            <Link to="/ferramentas" className="mt-4 inline-flex min-h-11 items-center gap-1 text-sm font-bold text-action hover:underline">
              Ver todas as ferramentas <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function ToolBikeCard({ bike, impact, position }: { bike: RecommendedBike; impact: ImpactLine[]; position: AffiliatePosition }) {
  return (
    <article className="overflow-hidden rounded-2xl bg-card ring-1 ring-line">
      <div className="bg-ink px-4 py-2 text-xs font-bold uppercase tracking-wide text-mint">
        {bike.role === "alternativa" ? "Mais autonomia para comparar" : "Menor preço compatível"}
      </div>
      <div className="grid grid-cols-[112px_minmax(0,1fr)] sm:grid-cols-[150px_minmax(0,1fr)]">
        <BikeMedia src={bike.image} name={bike.name} className="h-full min-h-40" />
        <div className="p-4">
          <h3 className="text-lg font-bold text-ink">{bike.name}</h3>
          <p className="mt-1 text-xl font-black text-ink">{brl(bike.price)}</p>
          <p className="text-xs text-muted-foreground">Oferta atual registrada pela Vitale no Mercado Livre.</p>
          <p className="mt-2 text-sm text-ink">
            {bike.autonomyKm} km de autonomia declarada
            {bike.capacity ? ` · ${bike.capacity} pessoa${bike.capacity > 1 ? "s" : ""}` : ""}
          </p>
        </div>
      </div>
      <div className="space-y-3 border-t border-line p-4">
        {impact.length > 0 && (
          <dl className="grid grid-cols-2 gap-2 rounded-md bg-surface p-3 text-sm ring-1 ring-line">
            {impact.map((l) => (
              <div key={l.label}>
                <dt className="text-xs text-muted-foreground">{l.label}</dt>
                <dd className="font-bold text-ink">{l.value}</dd>
              </div>
            ))}
          </dl>
        )}
        <p className="text-sm text-ink">{bike.reason}</p>
        {bike.tradeoff && (
          <p className="text-sm text-muted-foreground">
            Trade-off: {bike.tradeoff.extraPrice > 0 ? `${brl(bike.tradeoff.extraPrice)} a mais` : "mesmo preço ou menor"} por +{bike.tradeoff.extraAutonomyKm} km de autonomia declarada.
          </p>
        )}
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="outline" className="min-h-11 border-line text-action">
            <Link to="/radar/$bikeId" params={{ bikeId: bike.bikeId }}>
              <Bike aria-hidden="true" /> Ver no Radar
            </Link>
          </Button>
          <Button asChild className="min-h-11 bg-action text-primary-foreground hover:bg-action/90">
            <a href={bike.link} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackAffiliateClick({ bike_id: bike.bikeId, position })}>
              Ver oferta <ExternalLink aria-hidden="true" />
            </a>
          </Button>
        </div>
      </div>
    </article>
  );
}

