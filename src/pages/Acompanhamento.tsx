import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Flame, Target, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
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
  const [bikes, setBikes] = useState<RadarBike[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("opportunity");
  const [chips, setChips] = useState<ChipKey[]>([]);
  const [alertBike, setAlertBike] = useState<RadarEntry | null>(null);
  const catalogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_price_tracker_catalog");
      if (cancelled) return;
      if (rpcError || !Array.isArray(data)) {
        setError(true);
        setBikes([]);
        return;
      }
      setBikes(data as unknown as RadarBike[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
  const loading = bikes === null;

  const toggleChip = (chip: ChipKey) =>
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));

  const blocks = [
    { title: "Menores preços atuais", icon: Flame, list: highlights.lowestPrices },
    { title: "Maiores quedas recentes", icon: TrendingDown, list: highlights.biggestDrops },
    { title: "No menor preço registrado até agora", icon: Target, list: highlights.atMin },
  ].filter((b) => b.list.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Radar de Preços de Bikes Elétricas | Vitale Mobilidade</title>
        <meta
          name="description"
          content="Veja se hoje é um bom momento para comprar sua bike elétrica: compare o preço atual com o histórico real registrado pela Vitale."
        />
        <link rel="canonical" href="https://vitalemobilidade.com/acompanhamento" />
        <meta property="og:title" content="Veja se hoje é um bom momento para comprar sua bike" />
        <meta property="og:url" content="https://vitalemobilidade.com/acompanhamento" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta
          property="og:description"
          content="Compare o preço atual com o histórico e acompanhe as melhores oportunidades de bikes elétricas."
        />
      </Helmet>

      <main>
        <section className="border-b border-border/60 bg-gradient-to-br from-green-50 via-white to-white">
          <div className="responsive-container py-10 md:py-14">
            <div className="grid items-start gap-8 lg:grid-cols-[1.1fr,0.9fr]">
              <div>
                <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl lg:text-5xl">
                  <span className="text-gradient-green">Veja se hoje é um bom momento para comprar sua bike</span>
                </h1>
                <p className="mt-4 max-w-2xl text-base text-muted-foreground md:text-lg">
                  Compare o preço atual com o histórico e acompanhe as melhores oportunidades.
                </p>

                <div className="mt-6 max-w-xl">
                  <BikeSearchCombobox
                    entries={entries}
                    loading={bikes === null}
                    query={query}
                    onQueryChange={setQuery}
                    onSeeAll={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
                  />
                </div>

                {!loading && !error && entries.length > 0 && (
                  <dl className="mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl border border-border/60 bg-white p-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Bikes monitoradas</dt>
                      <dd className="mt-1 text-2xl font-bold">{summary.tracked}</dd>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-white p-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">No menor registrado</dt>
                      <dd className="mt-1 text-2xl font-bold text-primary">{summary.atLowest}</dd>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-white p-4">
                      <dt className="text-xs uppercase tracking-wide text-muted-foreground">Maior queda recente</dt>
                      <dd className="mt-1 text-2xl font-bold text-primary">
                        {summary.biggestDropPct === null ? "—" : `${Math.abs(summary.biggestDropPct).toFixed(1)}%`}
                      </dd>
                    </div>
                  </dl>
                )}

                {trackingSince && (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Com base no histórico registrado desde {formatDateBR(trackingSince)}.
                  </p>
                )}
              </div>

              <div>
                {loading ? (
                  <Skeleton className="h-[420px] w-full rounded-3xl" />
                ) : featured ? (
                  <div>
                    <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-primary">
                      {featuredIsOpportunity ? "Oportunidade em destaque" : "Bike em destaque"}
                    </p>
                    <RadarBikeCard entry={featured} onAlert={setAlertBike} highlight />
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </section>

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
              {blocks.map((block) => (
                <section key={block.title} className="mb-12" aria-label={block.title}>
                  <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold md:text-2xl">
                    <block.icon className="h-5 w-5 text-primary" aria-hidden="true" /> {block.title}
                  </h2>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {block.list.map((entry) => (
                      <RadarBikeCard key={`${block.title}-${entry.id}`} entry={entry} onAlert={setAlertBike} />
                    ))}
                  </div>
                </section>
              ))}

              <div className="mb-10">
                <OffersGroupCta source="radar_home" />
              </div>

              <section ref={catalogRef} aria-label="Catálogo acompanhado" className="scroll-mt-8">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <h2 className="text-xl font-semibold md:text-2xl">
                    Bikes acompanhadas{" "}
                    <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
                  </h2>
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

              <div className="mt-10 space-y-2 text-xs text-muted-foreground">
                <p>
                  Os preços exibidos são os que registramos nas nossas verificações. Preço e disponibilidade podem mudar
                  no Mercado Livre. Usamos links de afiliado.
                </p>
                {summary.atLowest > 0 && (
                  <p>
                    <Badge className="mr-2 border-0 bg-primary/15 text-primary">Menor preço observado</Badge>
                    significa o menor valor já registrado por nós — nunca comparação com outras lojas.
                  </p>
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

      <Footer />
    </div>
  );
};

export default Acompanhamento;
