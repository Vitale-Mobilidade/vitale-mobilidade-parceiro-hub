import { useMemo, type ReactNode } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink, LineChart, Sparkles, Users, Gauge, Youtube, Megaphone, ArrowRight } from "lucide-react";
import { SiteHeader, SiteFooter, BikeMedia } from "@/components/site/site-ui";
import { CommercialPriceBadge } from "@/components/site/CommercialPriceBadge";
import { VideoCards } from "@/components/site/VideoCards";
import { PriceRangeBar } from "@/components/radar/PriceRangeBar";
import { BikeGuides, type BikeGuide } from "@/components/site/BikeGuides";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { getRadarBike } from "@/lib/radar.functions";
import { safeVideos } from "@/lib/videos.functions";
import { dailyMetrics, type DailyPoint } from "@/lib/price-daily";
import { formatBRL, formatDateTimeBR } from "@/lib/price-tracker";
import { canonicalUrl, pageHead } from "@/lib/seo";
import type { CatalogBike } from "@/lib/editorial-bikes";
import { trackAffiliateClick, type AffiliatePosition } from "@/lib/affiliate-analytics";

type RadarDetail = {
  id: string;
  name: string;
  currentPrice: number;
  daily: DailyPoint[];
  lastObservedAt: string | null;
};

const km = (v: string | null) => { const m = v?.match(/(\d{1,4})\s*km/i); return m ? Number(m[1]) : null; };
const MAX_ALTERNATIVES = 3;

/** Alternativas: mesma capacidade, com preço de referência; ordenadas pela menor diferença de preço. */
function pickAlternatives(all: CatalogBike[], bike: CatalogBike): CatalogBike[] {
  if (!bike.capacity || bike.sheetPrice == null) return [];
  const base = bike.sheetPrice;
  return all
    .filter((b) => b.bikeId !== bike.bikeId && b.capacity === bike.capacity && b.sheetPrice != null)
    .sort((a, b) => Math.abs(a.sheetPrice! - base) - Math.abs(b.sheetPrice! - base) || a.name.localeCompare(b.name, "pt-BR"))
    .slice(0, MAX_ALTERNATIVES);
}

export const Route = createFileRoute("/bikes/$slug")({
  loader: async ({ params }) => {
    const slug = params.slug.toLowerCase();
    const cat = await getBikeCatalog();
    if (!cat.ok) throw new Error("catálogo indisponível");
    const bike = cat.bikes.find((b) => b.slug === slug);
    if (!bike) throw notFound();
    const [radarRes, videos] = await Promise.all([
      getRadarBike({ data: { bikeId: bike.bikeId } }).catch(() => ({ ok: false as const })),
      safeVideos({ bikeId: bike.bikeId, limit: 60 }),
    ]);
    const rb = radarRes.ok ? (radarRes.bike as unknown as RadarDetail | null) : null;
    const radar = rb && typeof rb.currentPrice === "number" && rb.currentPrice > 0
      ? { currentPrice: rb.currentPrice, daily: Array.isArray(rb.daily) ? rb.daily : [], lastObservedAt: rb.lastObservedAt ?? null }
      : null;
    return { bike, radar, radarOk: radarRes.ok, videos, alternatives: pickAlternatives(cat.bikes, bike) };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Bike indisponível | Vitale Mobilidade" }, { name: "robots", content: "noindex" }] };
    }
    const b = loaderData.bike;
    const facts = [b.autonomy && `autonomia ${b.autonomy.toLowerCase()}`, b.capacity && `capacidade ${b.capacity}`].filter(Boolean).join(", ");
    const path = `/bikes/${params.slug}`;
    const head = pageHead({
      path,
      title: `${b.name}: bike elétrica | Vitale Mobilidade`,
      description: `${b.name}${facts ? `: ${facts}` : ""}. Especificações, análise de preço e vídeos reais do modelo.`,
      ogType: "product",
    });
    if (b.image) head.meta.push({ property: "og:image", content: b.image }, { name: "twitter:image", content: b.image });
    const breadcrumbs = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Início", item: canonicalUrl("/") },
        { "@type": "ListItem", position: 2, name: "Bikes", item: canonicalUrl("/bikes") },
        { "@type": "ListItem", position: 3, name: b.name, item: canonicalUrl(path) },
      ],
    };
    return { ...head, scripts: [{ type: "application/ld+json", children: JSON.stringify(breadcrumbs) }] };
  },
  notFoundComponent: BikeNotFound,
  errorComponent: BikeUnavailable,
  component: BikeDetail,
});

function Shell({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <nav aria-label="Trilha" className="responsive-container pt-5 text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-muted-foreground">
          <li><Link to="/" className="hover:text-action">Início</Link></li>
          <li aria-hidden="true">›</li>
          <li><Link to="/bikes" className="hover:text-action">Bikes</Link></li>
          {name && (<><li aria-hidden="true">›</li><li aria-current="page" className="font-semibold text-ink">{name}</li></>)}
        </ol>
      </nav>
      <main className="responsive-container pb-12 pt-4">{children}</main>
      <SiteFooter />
    </div>
  );
}

function BikeNotFound() {
  return <Shell><Back /><p className="mt-8 rounded-xl bg-surface p-6 text-sm text-muted-foreground">Não encontramos este modelo.</p></Shell>;
}
function BikeUnavailable() {
  return <Shell><Back /><p className="mt-8 rounded-xl bg-surface p-6 text-sm text-muted-foreground">Não foi possível carregar este modelo agora. Tente novamente em instantes.</p></Shell>;
}
function Back() {
  return <Link to="/bikes" className="inline-flex items-center gap-2 text-sm font-semibold text-action hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas as bikes</Link>;
}

const GUIDES: BikeGuide[] = []; // sem fonte de artigos ainda — ver BikeGuides.

function BuyCta({ link, bikeId, position, className = "" }: { link: string | null; bikeId: string; position: AffiliatePosition; className?: string }) {
  if (!link) return <p className={`font-semibold text-ink ${className}`}>Link indisponível no momento</p>;
  return (
    <a href={link} target="_blank" rel="noopener noreferrer sponsored" onClick={() => trackAffiliateClick({ bike_id: bikeId, position })} className={`inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-action px-6 font-bold text-action-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mint ${className}`}>
      Ver oferta no Mercado Livre <ExternalLink className="h-4 w-4" aria-hidden="true" />
    </a>
  );
}

function BikeDetail() {
  const { bike, radar, radarOk, videos, alternatives } = Route.useLoaderData();
  const metrics = useMemo(() => (radar ? dailyMetrics({ daily: radar.daily, currentPrice: radar.currentPrice }, 30) : null), [radar]);
  // Oferta atual coesa: só existe quando preço E link vêm do mesmo registro válido.
  const offer = bike.link && bike.sheetPrice != null ? { link: bike.link, price: bike.sheetPrice } : null;
  const paragraphs = (bike.description ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  const specs = [
    bike.autonomy && { label: "Autonomia", value: bike.autonomy },
    bike.capacity && { label: "Capacidade", value: bike.capacity },
    bike.category && { label: "Categoria", value: bike.category },
  ].filter(Boolean) as { label: string; value: string }[];
  const summary = [
    bike.autonomy && { icon: Gauge, text: `Autonomia informada: ${bike.autonomy.toLowerCase()}` },
    bike.capacity && { icon: Users, text: `Capacidade: ${bike.capacity}` },
    radar ? { icon: LineChart, text: "Preço monitorado pelo Radar Vitale" } : { icon: LineChart, text: "Preço ainda não monitorado pelo Radar" },
    videos.length > 0 && { icon: Youtube, text: `${videos.length} ${videos.length === 1 ? "vídeo real" : "vídeos reais"} no canal` },
  ].filter(Boolean) as { icon: typeof Gauge; text: string }[];
  const first = videos.slice(0, 4);
  const rest = videos.slice(4);

  return (
    <Shell name={bike.name}>
      {/* Hero */}
      <header className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-10">
        <BikeMedia src={bike.image} name={bike.name} eager className="aspect-[4/3] w-full rounded-3xl ring-1 ring-line" />
        <div className="flex flex-col">
          {bike.category && <p className="text-xs font-bold uppercase tracking-[0.2em] text-action">{bike.category}</p>}
          <h1 className="mt-2 text-3xl font-black leading-tight tracking-tight text-ink md:text-5xl">{bike.name}</h1>
          {specs.length > 0 && <p className="mt-2 text-muted-foreground">{[bike.autonomy, bike.capacity].filter(Boolean).join(" · ")}</p>}
          <div className="mt-5 rounded-2xl bg-ink p-5 text-ink-foreground">
            {/* Oferta atual: preço e link vêm SEMPRE do mesmo registro.
                O selo do Radar só aparece com oferta ativa, para não parecer status de algo comprável. */}
            <CommercialPriceBadge hasOffer={!!offer} classification={metrics?.classification ?? null} />
            {offer ? (
              <>
                <p className="mt-3 text-4xl font-black tracking-tight">{formatBRL(offer.price)}</p>
                <p className="mt-1 text-xs text-ink-foreground/70">
                  Preço da oferta atual registrada pela Vitale, do mesmo anúncio do botão abaixo. Confirme no Mercado Livre antes de comprar.
                </p>
              </>
            ) : (
              <p className="mt-3 text-sm text-ink-foreground/80">Sem oferta ativa registrada para este modelo.</p>
            )}
            <div className="mt-4 flex flex-col gap-2 xl:flex-row">
              <BuyCta link={offer?.link ?? null} bikeId={bike.bikeId} position="bike_detail_hero" className="w-full xl:w-auto xl:whitespace-nowrap" />
              {radar && (
                <Link to="/radar/$bikeId" params={{ bikeId: bike.bikeId }} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-ink-foreground/30 px-5 text-sm font-bold hover:border-mint hover:text-mint">
                  <LineChart className="h-4 w-4" aria-hidden="true" /> Análise de preço completa
                </Link>
              )}
            </div>
            {radar && (
              <p className="mt-3 border-t border-ink-foreground/15 pt-3 text-xs text-ink-foreground/70">
                Observação histórica do Radar: {formatBRL(radar.currentPrice)}
                {radar.lastObservedAt ? ` registrado em ${formatDateTimeBR(radar.lastObservedAt)}` : ""}. É um registro de acompanhamento, não o preço do anúncio agora.
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Resumo de decisão */}
      <section aria-labelledby="resumo" className="mt-10">
        <h2 id="resumo" className="text-2xl font-black text-ink">Resumo rápido</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {summary.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-action" aria-hidden="true" />
              <span className="text-sm font-semibold text-ink">{text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Radar */}
      <section aria-labelledby="radar" className="mt-12">
        <h2 id="radar" className="text-2xl font-black text-ink">Preço no Radar</h2>
        {radar && metrics ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <PriceRangeBar currentPrice={radar.currentPrice} metrics={metrics} />
            <div className="rounded-2xl border border-line bg-card p-6">
              <h3 className="font-bold text-ink">Últimos 30 dias</h3>
              <dl className="mt-3 divide-y divide-line text-sm">
                {[
                  ["Menor verificado", formatBRL(metrics.minPrice)],
                  ["Preço típico", formatBRL(metrics.typicalPrice)],
                  ["Maior verificado", formatBRL(metrics.maxPrice)],
                  ["Cobertura", `${metrics.verifiedDays} de ${metrics.expectedDays} dias`],
                  ["Última verificação", metrics.lastVerifiedAt ? formatDateTimeBR(metrics.lastVerifiedAt) : "—"],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3 py-2"><dt className="text-muted-foreground">{k}</dt><dd className="font-bold text-ink">{v}</dd></div>
                ))}
              </dl>
              <Link to="/radar/$bikeId" params={{ bikeId: bike.bikeId }} className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-action hover:underline">
                Ver histórico completo <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : (
          <p className="mt-3 rounded-2xl bg-surface p-5 text-sm text-muted-foreground ring-1 ring-line">
            {radarOk
              ? "Este modelo ainda não é monitorado pelo Radar de preços, por isso não há histórico para comparar."
              : "Os dados do Radar estão indisponíveis agora. Tente novamente em instantes."}{" "}
            <Link to="/radar" className="font-semibold text-action hover:underline">Ver bikes monitoradas</Link>
          </p>
        )}
      </section>

      {/* Especificações */}
      {(specs.length > 0 || paragraphs.length > 0) && (
        <section aria-labelledby="specs" className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
            <h2 id="specs" className="text-2xl font-black text-ink">Especificações</h2>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {specs.map((s) => (
                <div key={s.label} className="rounded-xl bg-card p-3 ring-1 ring-line">
                  <dt className="text-xs text-muted-foreground">{s.label}</dt>
                  <dd className="font-bold text-ink">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {paragraphs.length > 0 && (
            <div>
              <h2 className="text-2xl font-black text-ink">Sobre o modelo</h2>
              <div className="mt-4 space-y-3 text-ink/85">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
            </div>
          )}
        </section>
      )}

      {/* Quiz */}
      <section aria-labelledby="quiz" className="mt-14 flex flex-col items-start justify-between gap-4 rounded-3xl bg-ink p-6 text-ink-foreground md:flex-row md:items-center md:p-10">
        <div>
          <Sparkles className="h-6 w-6 text-mint" aria-hidden="true" />
          <h2 id="quiz" className="mt-2 text-2xl font-black md:text-3xl">É a bike certa para o seu perfil?</h2>
          <p className="mt-2 max-w-xl text-ink-foreground/80">Responda sete perguntas rápidas e veja qual modelo combina com o seu uso.</p>
        </div>
        <Link to="/escolherbike" className="inline-flex h-12 shrink-0 items-center rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90">Fazer o Quiz</Link>
      </section>

      {/* Vídeos */}
      {videos.length > 0 && (
        <section aria-labelledby="videos" className="mt-14">
          <h2 id="videos" className="text-2xl font-black text-ink">Vídeos do {bike.name} <span className="text-base font-semibold text-muted-foreground">({videos.length})</span></h2>
          <VideoCards videos={first} className="mt-4" />
          {rest.length > 0 && (
            <details className="group mt-4">
              <summary className="inline-flex h-11 cursor-pointer list-none items-center rounded-xl border border-line px-5 text-sm font-bold text-ink hover:border-action">
                <span className="group-open:hidden">Ver todos os vídeos ({videos.length})</span>
                <span className="hidden group-open:inline">Mostrar menos</span>
              </summary>
              <VideoCards videos={rest} className="mt-4" />
            </details>
          )}
        </section>
      )}

      <BikeGuides guides={GUIDES} />

      {/* Alternativas */}
      {alternatives.length > 0 && (
        <section aria-labelledby="alternativas" className="mt-14">
          <h2 id="alternativas" className="text-2xl font-black text-ink">Modelos com a mesma capacidade e preço de referência próximo</h2>
          <p className="mt-1 text-sm text-muted-foreground">Critério: mesma capacidade ({bike.capacity}), ordenados pela menor diferença de preço de referência cadastrado.</p>
          <ul className="mt-4 grid gap-4 sm:grid-cols-3">
            {alternatives.map((a) => (
              <li key={a.bikeId}>
                <Link to="/bikes/$slug" params={{ slug: a.slug }} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card ring-1 ring-line hover:ring-action">
                  <BikeMedia src={a.image} name={a.name} className="aspect-[4/3] w-full" />
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="font-bold text-ink">{a.name}</h3>
                    <p className="text-sm text-muted-foreground">{[a.autonomy, a.capacity].filter(Boolean).join(" · ")}</p>
                    <p className="mt-2 font-black text-ink">{formatBRL(a.sheetPrice)}</p>
                    <p className="text-xs text-muted-foreground">Preço de referência cadastrado</p>
                    <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-semibold text-ink group-hover:text-action">Conhecer a bike <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Grupo */}
      <section className="mt-14 flex flex-col items-start justify-between gap-4 rounded-2xl bg-mint/20 p-6 ring-1 ring-mint md:flex-row md:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-black text-ink"><Megaphone className="h-5 w-5 text-action" aria-hidden="true" /> Grupo de Ofertas Vitale</h2>
          <p className="mt-1 text-muted-foreground">Oportunidades de bikes elétricas no WhatsApp. Somente admins publicam.</p>
        </div>
        <Link to="/grupodeofertas" className="inline-flex h-11 items-center rounded-xl bg-ink px-5 text-sm font-bold text-ink-foreground hover:opacity-90">Entrar no grupo</Link>
      </section>

      {/* CTA final */}
      {offer && (
        <section aria-label="Comprar" className="mt-10 flex flex-col items-center gap-3 rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
          <p className="text-lg font-black text-ink">Decidiu pelo {bike.name}?</p>
          <BuyCta link={offer.link} bikeId={bike.bikeId} position="bike_detail_final" />
          <p className="text-xs text-muted-foreground">Preço e disponibilidade devem ser confirmados no Mercado Livre.</p>
        </section>
      )}
      <div className="mt-8"><Back /></div>
    </Shell>
  );
}
