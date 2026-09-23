import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, X, Sparkles, LineChart, Users } from "lucide-react";
import { SiteHeader, SiteFooter, SectionHeading } from "@/components/site/site-ui";
import { BikeCatalogCard } from "@/components/site/BikeCatalogCard";
import { VideoCards } from "@/components/site/VideoCards";
import { getBikesDiscovery, type DiscoveryBike } from "@/lib/bikes-discovery.functions";
import { normalizeText } from "@/lib/price-daily";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/bikes/")({
  loader: () =>
    getBikesDiscovery().catch(() => ({ ok: false, radarOk: false, videosOk: false, bikes: [] as DiscoveryBike[], videos: [] })),
  head: () =>
    pageHead({
      path: "/bikes",
      title: "Bikes elétricas: encontre o modelo certo | Vitale Mobilidade",
      description:
        "Todos os modelos de bikes elétricas acompanhados pela Vitale: autonomia, capacidade, preços com fonte explícita e vídeos reais de cada modelo.",
      ogTitle: "Encontre a bike elétrica certa para o seu perfil",
      ogDescription: "Modelos, especificações, preços com fonte explícita e testes em vídeo.",
    }),
  component: BikesIndex,
});

type SortKey = "name" | "price_asc" | "price_desc" | "autonomy_desc";
const SORT_LABEL: Record<SortKey, string> = {
  name: "Nome (A–Z)",
  price_asc: "Menor preço",
  price_desc: "Maior preço",
  autonomy_desc: "Maior autonomia",
};

/** Preço comercial da oferta atual (card, filtro e ordenação). O Radar é histórico e nunca entra aqui. */
const priceOf = (b: DiscoveryBike) => b.sheetPrice ?? null;

/** Nulos sempre por último, independentemente da direção. */
function cmpNullable(a: number | null, b: number | null, dir: 1 | -1) {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return (a - b) * dir;
}

function BikesIndex() {
  const { ok, radarOk, bikes, videos } = Route.useLoaderData();
  const [q, setQ] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [minKm, setMinKm] = useState(0);
  const [people, setPeople] = useState(0);
  const [radarOnly, setRadarOnly] = useState(false);
  const [sort, setSort] = useState<SortKey>("name");

  const kmOptions = useMemo(
    () => [...new Set(bikes.map((b) => b.autonomyKm).filter((n): n is number => n !== null))].sort((a, b) => a - b),
    [bikes],
  );
  const peopleOptions = useMemo(
    () => [...new Set(bikes.map((b) => b.capacityPeople).filter((n): n is number => n !== null))].sort(),
    [bikes],
  );
  const radarCount = bikes.filter((b) => b.radar).length;

  const results = useMemo(() => {
    const nq = normalizeText(q.trim());
    const lo = minPrice ? Number(minPrice) : null;
    const hi = maxPrice ? Number(maxPrice) : null;
    const list = bikes.filter((b) => {
      if (nq && !normalizeText(b.name).includes(nq)) return false;
      const p = priceOf(b);
      if ((lo !== null || hi !== null) && p === null) return false;
      if (lo !== null && p! < lo) return false;
      if (hi !== null && p! > hi) return false;
      if (minKm && (b.autonomyKm === null || b.autonomyKm < minKm)) return false;
      if (people && b.capacityPeople !== people) return false;
      if (radarOnly && !b.radar) return false;
      return true;
    });
    const byName = (a: DiscoveryBike, b: DiscoveryBike) => a.name.localeCompare(b.name, "pt-BR");
    return [...list].sort((a, b) => {
      const r =
        sort === "price_asc" ? cmpNullable(priceOf(a), priceOf(b), 1)
        : sort === "price_desc" ? cmpNullable(priceOf(a), priceOf(b), -1)
        : sort === "autonomy_desc" ? cmpNullable(a.autonomyKm, b.autonomyKm, -1)
        : 0;
      return r || byName(a, b);
    });
  }, [bikes, q, minPrice, maxPrice, minKm, people, radarOnly, sort]);

  const active = !!(q || minPrice || maxPrice || minKm || people || radarOnly);
  const clear = () => { setQ(""); setMinPrice(""); setMaxPrice(""); setMinKm(0); setPeople(0); setRadarOnly(false); };
  const maxKm = kmOptions.at(-1) ?? null;

  const chip = (on: boolean) =>
    `inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
      on ? "bg-ink text-ink-foreground" : "bg-surface text-ink ring-1 ring-line hover:ring-action"
    }`;
  const field = "h-11 w-full rounded-xl border border-line bg-background px-3 text-sm text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <section className="entry-hero" aria-labelledby="bikes-h1">
        <picture>
          <source media="(max-width: 767px)" srcSet="/vitale-hero-bikes-2026-mobile.webp" width={600} height={909} />
          <source media="(max-width: 1400px)" srcSet="/vitale-hero-bikes-2026-1280.webp" width={1280} height={720} />
          <img src="/vitale-hero-bikes-2026.webp" width={1672} height={941} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover object-[75%_center]" />
        </picture>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/10 max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/60 max-md:to-ink/10" aria-hidden="true" />
        <div className="responsive-container entry-hero-inner">
          <p className="entry-eyebrow">Catálogo Vitale</p>
          <h1 id="bikes-h1" className="entry-h1">
            Encontre a bike elétrica certa para o seu perfil
          </h1>
          <p className="entry-lead">
            {ok ? `${bikes.length} modelos` : "Modelos"} com especificações, preços com fonte explícita e testes reais em vídeo do nosso canal.
          </p>
          {ok && (
            <>
              <label htmlFor="bike-search" className="sr-only">Buscar bike pelo nome</label>
              <div className="relative mt-6 max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                <input
                  id="bike-search"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Buscar modelo, ex.: V9 Max"
                  className="h-14 w-full rounded-2xl bg-background pl-12 pr-4 text-base text-ink shadow-lg placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-mint"
                />
              </div>
            </>
          )}
        </div>
      </section>
      {ok && (
        <div className="responsive-container relative z-10 -mt-16 md:-mt-20">
              <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-3 shadow-xl ring-1 ring-line md:p-4" role="group" aria-label="Atalhos">
                <span className="px-1 text-sm font-bold text-ink">Atalhos:</span>
                {peopleOptions.includes(2) && (
                  <button type="button" aria-pressed={people === 2} onClick={() => setPeople(people === 2 ? 0 : 2)} className={chip(people === 2)}>
                    <Users className="h-4 w-4" aria-hidden="true" /> Para 2 pessoas
                  </button>
                )}
                {maxKm !== null && maxKm >= 100 && (
                  <button type="button" aria-pressed={minKm === 100} onClick={() => setMinKm(minKm === 100 ? 0 : 100)} className={chip(minKm === 100)}>
                    Autonomia de 100 km ou mais
                  </button>
                )}
                {radarCount > 0 && (
                  <button type="button" aria-pressed={radarOnly} onClick={() => setRadarOnly(!radarOnly)} className={chip(radarOnly)}>
                    <LineChart className="h-4 w-4" aria-hidden="true" /> Com preço no Radar
                  </button>
                )}
              </div>
        </div>
      )}

      <main className="responsive-container py-8 md:py-12">
        {!ok ? (
          <p className="text-muted-foreground">O catálogo está indisponível no momento. Tente novamente em instantes.</p>
        ) : (
          <>
            <form className="grid gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => e.preventDefault()} aria-label="Filtros">
              <div>
                <label htmlFor="f-min" className="text-xs font-semibold text-ink">Preço mínimo (R$)</label>
                <input id="f-min" inputMode="numeric" type="number" min={0} step={100} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="f-max" className="text-xs font-semibold text-ink">Preço máximo (R$)</label>
                <input id="f-max" inputMode="numeric" type="number" min={0} step={100} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className={field} />
              </div>
              <div>
                <label htmlFor="f-km" className="text-xs font-semibold text-ink">Autonomia mínima</label>
                <select id="f-km" value={minKm} onChange={(e) => setMinKm(Number(e.target.value))} className={field}>
                  <option value={0}>Qualquer</option>
                  {kmOptions.map((k) => <option key={k} value={k}>{k} km ou mais</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-cap" className="text-xs font-semibold text-ink">Capacidade</label>
                <select id="f-cap" value={people} onChange={(e) => setPeople(Number(e.target.value))} className={field}>
                  <option value={0}>Qualquer</option>
                  {peopleOptions.map((p) => <option key={p} value={p}>{p} {p === 1 ? "pessoa" : "pessoas"}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="f-sort" className="text-xs font-semibold text-ink">Ordenar por</label>
                <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className={field}>
                  {(Object.keys(SORT_LABEL) as SortKey[]).map((k) => <option key={k} value={k}>{SORT_LABEL[k]}</option>)}
                </select>
              </div>
              <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-5">
                O filtro e a ordenação de preço usam o preço da oferta atual de cada modelo. Modelos sem oferta ativa ficam fora do filtro de preço e no fim da ordenação; o preço do Radar aparece apenas como histórico.
              </p>
            </form>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <p className="font-semibold text-ink" aria-live="polite">
                {results.length} {results.length === 1 ? "modelo encontrado" : "modelos encontrados"}
              </p>
              {active && (
                <button type="button" onClick={clear} className="inline-flex h-10 items-center gap-1 rounded-xl border border-line px-4 text-sm font-semibold text-ink hover:border-action">
                  <X className="h-4 w-4" aria-hidden="true" /> Limpar filtros
                </button>
              )}
            </div>
            {!radarOk && <p className="mt-2 text-xs text-muted-foreground">O histórico do Radar está indisponível agora; os preços exibidos são os das ofertas atuais.</p>}

            {results.length ? (
              <ul className="mt-4 grid grid-cols-1 gap-4 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 min-[1920px]:grid-cols-5">
                {results.map((b) => <li key={b.bikeId}><BikeCatalogCard bike={b} /></li>)}
              </ul>
            ) : (
              <p className="mt-8 rounded-2xl bg-surface p-6 text-center text-muted-foreground">Nenhum modelo corresponde a esses filtros.</p>
            )}

            <section className="mt-14 grid gap-4 md:grid-cols-2" aria-label="Próximos passos">
              <div className="rounded-2xl bg-ink p-6 text-ink-foreground md:p-8">
                <Sparkles className="h-6 w-6 text-mint" aria-hidden="true" />
                <h2 className="section-h2 mt-3">Não sabe por onde começar?</h2>
                <p className="mt-2 text-ink-foreground/80">Responda sete perguntas rápidas e veja o modelo indicado para o seu perfil.</p>
                <Link to="/escolherbike" className="mt-5 inline-flex h-11 items-center rounded-xl bg-mint px-5 text-sm font-bold text-mint-foreground hover:opacity-90">Fazer o Quiz</Link>
              </div>
              <div className="rounded-2xl bg-surface p-6 ring-1 ring-line md:p-8">
                <LineChart className="h-6 w-6 text-action" aria-hidden="true" />
                <h2 className="section-h2 mt-3 text-ink">O preço de hoje está bom?</h2>
                <p className="mt-2 text-muted-foreground">Compare o preço atual com o histórico registrado pelo Radar Vitale.</p>
                <Link to="/radar" className="mt-5 inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-bold text-ink-foreground hover:opacity-90">Abrir o Radar de preços</Link>
              </div>
            </section>

            {videos.length > 0 && (
              <section className="mt-14" aria-labelledby="bikes-videos">
                <SectionHeading id="bikes-videos" title="Testes em vídeo" sub="Vídeos recentes do canal sobre os modelos do catálogo." />
                <VideoCards videos={videos} className="mt-6" />
              </section>
            )}

            <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-2xl bg-mint/20 p-6 ring-1 ring-mint md:flex-row md:items-center md:p-8">
              <div>
                <h2 className="text-xl font-black text-ink">Grupo de Ofertas Vitale</h2>
                <p className="mt-1 text-muted-foreground">Receba oportunidades no WhatsApp. Somente admins publicam.</p>
              </div>
              <Link to="/grupodeofertas" className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-bold text-ink-foreground hover:opacity-90">Entrar no grupo</Link>
            </section>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
