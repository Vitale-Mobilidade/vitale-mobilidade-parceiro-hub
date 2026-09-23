import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, BarChart3, BellRing, ExternalLink, Flame, LineChart, Target, TrendingDown, Youtube, BookOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useLoaderData } from "@tanstack/react-router";
import { VideoCards } from "@/components/site/VideoCards";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { SiteHeader, SiteFooter, SectionHeading, BikeMedia, PriceStatus, DisabledCta } from "@/components/site/site-ui";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { shortDiagnosis } from "@/lib/radar-rankings";
import { BikeSearchCombobox } from "@/components/radar/BikeSearchCombobox";
import { OffersGroupCta } from "@/components/radar/OffersGroupCta";
import { PriceAlertDialog } from "@/components/radar/PriceAlertDialog";
import { RadarBikeCard } from "@/components/radar/RadarBikeCard";
import { formatBRL, formatDateBR } from "@/lib/price-tracker";
import { trackRadar } from "@/lib/radar-analytics";
import {
  buildHighlights,
  buildRadarEntries,
  buildSummary,
  CHIP_LABEL,
  isOpportunity,
  matchesChips,
  searchEntries,
  SORT_LABEL,
  sortEntries,
  type ChipKey,
  type RadarBike,
  type RadarEntry,
  type SortKey,
} from "@/lib/radar-rankings";

const CHIPS: ChipKey[] = ["lowest", "recent_drop", "under_5k", "5k_8k", "over_8k"];
const SORTS: SortKey[] = ["opportunity", "drop", "price", "name"];

const Acompanhamento = () => {
  // Dados reais vêm do loader (SSR + hidratação); sem segunda chamada no cliente.
  const initial = useLoaderData({ from: "/acompanhamento/" });
  const bikes = useMemo<RadarBike[]>(
    () => (initial.ok ? (initial.bikes as unknown as RadarBike[]) : []),
    [initial],
  );
  const error = !initial.ok;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("opportunity");
  const [chips, setChips] = useState<ChipKey[]>([]);
  const [alertBike, setAlertBike] = useState<RadarEntry | null>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    trackRadar("radar_viewed");
  }, []);

  const entries = useMemo(() => buildRadarEntries(bikes ?? [], "all"), [bikes]);
  const highlights = useMemo(() => buildHighlights(entries), [entries]);
  const summary = useMemo(() => buildSummary(entries), [entries]);

  const filtered = useMemo(() => {
    const bySearch = searchEntries(entries, query);
    const byChips = bySearch.filter((e) => matchesChips(e, chips));
    return sortEntries(byChips, sort);
  }, [entries, query, chips, sort]);

  const trackingSince = useMemo(() => {
    const dates = entries.map((e) => e.firstObservedAt).filter(Boolean) as string[];
    return dates.length ? dates.sort()[0] : null;
  }, [entries]);

  const opportunities = useMemo(() => entries.filter(isOpportunity), [entries]);
  const featured =
    opportunities[0] ?? highlights.atMin[0] ?? highlights.biggestDrops[0] ?? highlights.lowestPrices[0] ?? null;
  const featuredIsOpportunity = isOpportunity(featured);
  const loading = false; // dados já chegam no SSR

  const toggleChip = (chip: ChipKey) =>
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));

  const blocks = [
    { title: "Menores preços atuais", icon: Flame, list: highlights.lowestPrices },
    { title: "Maiores quedas recentes", icon: TrendingDown, list: highlights.biggestDrops },
    { title: "No menor preço registrado até agora", icon: Target, list: highlights.atMin },
  ].filter((b) => b.list.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <section className="entry-hero">
          <picture>
            <source media="(max-width: 767px)" srcSet="/vitale-hero-radar-2026-mobile.webp" width={600} height={909} />
            <source media="(max-width: 1400px)" srcSet="/vitale-hero-radar-2026-1280.webp" width={1280} height={720} />
            <img src="/vitale-hero-radar-2026.webp" width={1672} height={941} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
          </picture>
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/40 max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/80 max-md:to-ink/40" aria-hidden="true" />
          <div className="responsive-container entry-hero-inner">
            <p className="entry-eyebrow">RADAR DE PREÇOS</p>
            <h1 className="entry-h1">
              Veja se hoje é um bom momento para <span className="text-mint">comprar sua bike elétrica</span>
            </h1>
            <p className="entry-lead">
              Registramos os preços das bikes elétricas acompanhadas e comparamos o valor atual com o histórico real de cada modelo.
            </p>
          </div>
        </section>
        <div className="responsive-container relative z-10 -mt-16 md:-mt-20">
          <div className="grid gap-4 rounded-2xl bg-card p-4 shadow-xl ring-1 ring-line md:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:items-end">
              <div className="max-w-xl text-foreground">
                <BikeSearchCombobox
                  entries={entries}
                  loading={false}
                  query={query}
                  onQueryChange={setQuery}
                  onSeeAll={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
                />
              </div>
              {!error && entries.length > 0 && (
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {[
                    { k: "Bikes monitoradas", v: String(summary.tracked) },
                    { k: "No menor preço registrado", v: String(summary.atLowest) },
                    { k: "Maior queda recente", v: summary.biggestDropPct === null ? "—" : `${Math.abs(summary.biggestDropPct).toFixed(1).replace(".", ",")}%` },
                  ].map((i) => (
                    <div key={i.k} className="rounded-xl bg-surface p-4 text-card-foreground">
                      <dd className="text-2xl font-extrabold text-ink">{i.v}</dd>
                      <dt className="text-sm text-muted-foreground">{i.k}</dt>
                    </div>
                  ))}
                </dl>
              )}
              {trackingSince && (
                <p className="text-sm text-muted-foreground lg:col-span-2">Histórico registrado desde {formatDateBR(trackingSince)}.</p>
              )}
          </div>
        </div>

        {!error && featured && (
          <section aria-labelledby="destaque" className="responsive-container pt-10">
            <SectionHeading id="destaque" title={featuredIsOpportunity ? "Oportunidade em destaque" : "Bike em destaque"} action={<Link to="/acompanhamento/$bikeId" params={{ bikeId: featured.id }} className="inline-flex items-center gap-1 hover:underline">Ver análise completa <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
            <div className="mt-5 grid gap-6 rounded-3xl border border-line bg-card p-5 md:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
              <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <BikeMedia src={featured.image} name={featured.name} className="h-56 rounded-2xl" eager />
                <div className="flex min-w-0 flex-col">
                  <PriceStatus classification={featured.metrics.classification} />
                  <h3 className="mt-2 text-xl font-bold text-ink">{featured.name}</h3>
                  <p className="mt-2 text-3xl font-extrabold text-action">{formatBRL(featured.currentPrice)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{shortDiagnosis(featured)}</p>
                  <div className="mt-auto space-y-2 pt-4">
                    <a href={featured.link} target="_blank" rel="noopener noreferrer nofollow sponsored" onClick={() => trackRadar("radar_ml_click", { bike_id: featured.id, position: "highlight" })} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-4 font-bold text-primary-foreground hover:opacity-90">
                      Ver oferta no Mercado Livre <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                    <button type="button" onClick={() => { trackRadar("radar_alert_opened", { bike_id: featured.id, source: "card" }); setAlertBike(featured); }} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:bg-surface">
                      <BellRing className="h-4 w-4" aria-hidden="true" /> Registrar alerta de preço
                    </button>
                  </div>
                </div>
              </div>
              <div className="min-w-0">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink"><LineChart className="h-4 w-4 text-action" aria-hidden="true" /> Histórico diário registrado</p>
                <DailyPriceChart series={featured.metrics.series} />
              </div>
            </div>
          </section>
        )}

        {!error && blocks.length > 0 && (
          <section aria-label="Rankings do Radar" className="responsive-container grid gap-5 pt-10 md:grid-cols-3">
            {blocks.map((block) => (
              <div key={block.title} className="rounded-2xl border border-line bg-card p-5">
                <h2 className="flex items-center gap-2 font-bold text-ink"><block.icon className="h-5 w-5 text-action" aria-hidden="true" /> {block.title}</h2>
                <ul className="mt-3 divide-y divide-line">
                  {block.list.map((e) => (
                    <li key={e.id}>
                      <Link to="/acompanhamento/$bikeId" params={{ bikeId: e.id }} className="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-3 py-3 hover:text-action">
                        <BikeMedia src={e.image} name={e.name} className="h-12 w-14 rounded-lg" />
                        <span className="min-w-0"><span className="block truncate font-semibold">{e.name}</span><span className="block font-bold text-action">{formatBRL(e.currentPrice)}</span></span>
                        {typeof e.dropPct === "number" && e.dropPct < 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-sm font-bold text-action"><ArrowDown className="h-4 w-4" aria-hidden="true" />{Math.abs(e.dropPct).toFixed(1).replace(".", ",")}%</span>
                        ) : <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}

        <div className="responsive-container py-10">
          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-96 w-full rounded-3xl" />
              ))}
            </div>
          )}

          {!loading && error && (
            <p className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              Não foi possível carregar o histórico agora. Tente novamente em alguns minutos.
            </p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
              Ainda não há bikes com acompanhamento disponível.
            </p>
          )}

          {!loading && !error && entries.length > 0 && (
            <>
              <div className="mb-10">
                <OffersGroupCta source="radar_home" />
              </div>

              <section ref={catalogRef} aria-label="Catálogo acompanhado" className="scroll-mt-8">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <SectionHeading id="todas" title={`Todas as bikes monitoradas (${filtered.length})`} />
                  <div>
                    <label htmlFor="radar-sort" className="mr-2 text-sm text-muted-foreground">
                      Ordenar por
                    </label>
                    <select
                      id="radar-sort"
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="h-11 rounded-xl border border-border bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      {SORTS.map((key) => (
                        <option key={key} value={key}>
                          {SORT_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="mb-6 flex flex-wrap gap-2">
                  {CHIPS.map((chip) => {
                    const active = chips.includes(chip);
                    return (
                      <button
                        key={chip}
                        type="button"
                        aria-pressed={active}
                        onClick={() => toggleChip(chip)}
                        className={`min-h-10 rounded-full border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-white text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {CHIP_LABEL[chip]}
                      </button>
                    );
                  })}
                  {chips.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setChips([])}
                      className="min-h-10 rounded-full px-3 text-sm text-primary underline-offset-4 hover:underline"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>

                {filtered.length === 0 ? (
                  <div className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                    Nenhuma bike encontrada com esses filtros.{" "}
                    <button
                      type="button"
                      className="font-medium text-primary underline"
                      onClick={() => {
                        setQuery("");
                        setChips([]);
                      }}
                    >
                      Ver todas as bikes
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((entry) => (
                      <RadarBikeCard key={entry.id} entry={entry} onAlert={setAlertBike} />
                    ))}
                  </div>
                )}
              </section>

              {initial.videos?.length > 0 && (
                <section aria-labelledby="radar-videos" className="mt-12">
                  <h2 id="radar-videos" className="flex items-center gap-2 text-xl font-bold text-ink"><Youtube className="h-5 w-5 text-action" aria-hidden="true" /> Testes e análises em vídeo</h2>
                  <VideoCards videos={initial.videos} className="mt-4" />
                </section>
              )}

              <div className="mt-10 space-y-2 text-sm text-muted-foreground">
                <p>
                  Os preços exibidos são os que registramos nas nossas verificações. Preço e disponibilidade podem mudar
                  no Mercado Livre. Usamos links de afiliado.
                </p>
                {summary.atLowest > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="border-0 bg-primary/15 text-primary">Menor preço registrado</Badge>
                    <span>significa o menor valor já registrado por nós — nunca comparação com outras lojas.</span>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>

      {alertBike && (
        <PriceAlertDialog
          open={!!alertBike}
          onOpenChange={(open) => !open && setAlertBike(null)}
          bikeId={alertBike.id}
          bikeName={alertBike.name}
          currentPrice={alertBike.currentPrice}
        />
      )}

      <SiteFooter />
    </div>
  );
};

export default Acompanhamento;
