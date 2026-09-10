import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Search, TrendingDown, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import {
  buildTrackerEntries,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_TONE,
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  pickHighlights,
  type TrackerBike,
  type TrackerEntry,
} from "@/lib/price-tracker";

const WINDOW_DAYS = 30;

function DeltaTag({ entry }: { entry: TrackerEntry }) {
  const { deltaAbs, deltaPct } = entry.stats;
  if (deltaAbs === null || deltaPct === null || deltaAbs === 0) {
    return <span className="text-xs text-muted-foreground">Sem variação registrada</span>;
  }
  const down = deltaAbs < 0;
  return (
    <span className={`text-xs font-medium ${down ? "text-primary" : "text-destructive"}`}>
      {down ? "▼" : "▲"} {formatBRL(Math.abs(deltaAbs))} ({Math.abs(deltaPct).toFixed(1)}%) desde o preço anterior
    </span>
  );
}

function BikeCard({ entry }: { entry: TrackerEntry }) {
  const cls = entry.stats.classification;
  return (
    <Link
      to={`/acompanhamento/${entry.id}`}
      className="group flex flex-col rounded-2xl border border-border/60 bg-white p-4 shadow-sm transition-all hover:border-primary/30 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div className="mb-3 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-green-50/60">
        {entry.image ? (
          <img
            src={entry.image}
            alt={`Bike elétrica ${entry.name}`}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Imagem indisponível</span>
        )}
      </div>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-base font-semibold leading-tight">{entry.name}</h3>
        <Badge className={`shrink-0 border-0 ${CLASSIFICATION_TONE[cls]}`}>{CLASSIFICATION_LABEL[cls]}</Badge>
      </div>
      <p className="mt-2 text-2xl font-bold text-primary">{formatBRL(entry.currentPrice)}</p>
      <DeltaTag entry={entry} />
      <dl className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <dt>Menor preço observado</dt>
          <dd className="font-medium text-foreground">{formatBRL(entry.stats.minObserved)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Última atualização</dt>
          <dd>{formatDateTimeBR(entry.stats.lastObservedAt)}</dd>
        </div>
      </dl>
      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Ver histórico <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </span>
    </Link>
  );
}

const Acompanhamento = () => {
  const [bikes, setBikes] = useState<TrackerBike[] | null>(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");

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
      setBikes(data as unknown as TrackerBike[]);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const entries = useMemo(() => buildTrackerEntries(bikes ?? [], WINDOW_DAYS), [bikes]);
  const highlights = useMemo(() => pickHighlights(entries), [entries]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => e.name.toLowerCase().includes(q));
  }, [entries, query]);

  const trackingSince = useMemo(() => {
    const dates = entries.map((e) => e.stats.firstObservedAt).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.sort()[0];
  }, [entries]);

  const loading = bikes === null;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Radar de Preços de Bikes Elétricas | Vitale Mobilidade</title>
        <meta
          name="description"
          content="Acompanhe o histórico real de preços das bikes elétricas e descubra se este é um bom momento para comprar."
        />
        <link rel="canonical" href="https://vitalemobilidade.com/acompanhamento" />
        <meta property="og:title" content="Radar de Preços de Bikes Elétricas | Vitale Mobilidade" />
        <meta property="og:url" content="https://vitalemobilidade.com/acompanhamento" />
        <meta
          property="og:description"
          content="Histórico real de preços de bikes elétricas acompanhado diariamente pela Vitale Mobilidade."
        />
      </Helmet>

      <main>
        <section className="border-b border-border/60 bg-gradient-to-br from-green-50 to-white">
          <div className="responsive-container py-12 md:py-16">
            <h1 className="text-3xl font-bold leading-tight md:text-4xl lg:text-5xl">
              <span className="text-gradient-green">Radar de Preços de Bikes</span>
            </h1>
            <p className="mt-4 max-w-3xl text-base text-muted-foreground md:text-lg">
              Acompanhe o histórico de preços e descubra se este é um bom momento para comprar sua bike.
            </p>
            {trackingSince && (
              <p className="mt-2 text-sm text-muted-foreground">
                Com base no histórico registrado desde {formatDateBR(trackingSince)}.
              </p>
            )}

            <div className="mt-6 max-w-xl">
              <label htmlFor="busca-bike" className="mb-2 block text-sm font-medium">
                Qual bike você quer acompanhar?
              </label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="busca-bike"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Digite o nome da bike"
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </section>

        <div className="responsive-container py-10">
          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-80 w-full rounded-2xl" />
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
              {(highlights.opportunities.length > 0 || highlights.drops.length > 0 || highlights.lowest.length > 0) && (
                <section className="mb-10 grid gap-4 md:grid-cols-3" aria-label="Destaques do histórico">
                  {[
                    { title: "Melhores oportunidades", list: highlights.opportunities },
                    { title: "Maiores quedas", list: highlights.drops },
                    { title: "Menores preços observados", list: highlights.lowest },
                  ]
                    .filter((b) => b.list.length > 0)
                    .map((block) => (
                      <div key={block.title} className="rounded-2xl border border-border/60 bg-green-50/40 p-5">
                        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-primary">
                          <TrendingDown className="h-4 w-4" aria-hidden="true" /> {block.title}
                        </h2>
                        <ul className="mt-3 space-y-2">
                          {block.list.map((e) => (
                            <li key={e.id}>
                              <Link
                                to={`/acompanhamento/${e.id}`}
                                className="flex items-center justify-between gap-3 rounded-lg px-2 py-1 text-sm hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              >
                                <span className="truncate">{e.name}</span>
                                <span className="shrink-0 font-semibold text-primary">{formatBRL(e.currentPrice)}</span>
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                </section>
              )}

              <section aria-label="Catálogo acompanhado">
                <h2 className="mb-4 text-xl font-semibold">
                  Bikes acompanhadas <span className="text-sm font-normal text-muted-foreground">({filtered.length})</span>
                </h2>
                {filtered.length === 0 ? (
                  <p className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                    Nenhuma bike encontrada com esse nome.
                  </p>
                ) : (
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {filtered.map((entry) => (
                      <BikeCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                )}
              </section>

              <p className="mt-8 text-xs text-muted-foreground">
                Os preços exibidos são os que registramos nas nossas sincronizações. Preço e disponibilidade podem mudar
                no Mercado Livre.
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Acompanhamento;
