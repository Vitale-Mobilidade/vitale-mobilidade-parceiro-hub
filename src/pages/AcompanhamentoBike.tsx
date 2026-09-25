import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { ArrowRight, BellRing, BookOpen, Check, ExternalLink } from "lucide-react";
import type { RadarBikeData } from "@/lib/radar-routes";
import { useRadarBase } from "@/lib/radar-base";
import { VideoCards } from "@/components/site/VideoCards";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader, SiteFooter, BikeMedia, SectionHeading } from "@/components/site/site-ui";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { OffersGroupCta } from "@/components/radar/OffersGroupCta";
import { PriceAlertDialog } from "@/components/radar/PriceAlertDialog";
import { PriceIntelPanel } from "@/components/radar/PriceIntelPanel";
import { BikeHubComparison } from "@/components/radar/BikeHubComparison";
import { UnavailableExplainer } from "@/components/radar/UnavailableExplainer";
import { lastConfirmedDay } from "@/lib/radar-unavailable";
import { formatBRL, formatDateBR, isSafePurchaseLink } from "@/lib/price-tracker";
import { dailyMetrics, expandDaily, type DailyPoint, type DailyWindow } from "@/lib/price-daily";
import { trackRadar } from "@/lib/radar-analytics";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import { QuizBanner } from "@/components/site/DecisionBanners";

interface RadarBikeDetail {
  id: string;
  name: string;
  /** Só existe quando há oferta atual válida (mesma linha de bike_offers). */
  currentPrice?: number | null;
  link?: string | null;
  hasCurrentOffer?: boolean;
  lastObservedPrice?: number | null;
  image: string | null;
  shortDescription?: string | null;
  description?: string | null;
  perfilIndicado?: string | null;
  diferencial?: string | null;
  strengths?: string[] | null;
  bestFor?: string[] | null;
  terrains?: string[] | null;
  autonomyKm?: number | null;
  capacity?: number | null;
  weightSupportKg?: number | null;
  daily: DailyPoint[];
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  observations: number;
  minObserved: number | null;
  maxObserved: number | null;
}

function splitDescription(text: string, limit = 600): [string, string] {
  if (text.length <= limit) return [text, ""];
  const paragraphEnd = text.lastIndexOf("\n", limit);
  const lastSpace = text.slice(0, limit + 1).search(/\s+\S*$/);
  const cut = paragraphEnd > limit / 2 ? paragraphEnd : lastSpace > limit / 2 ? lastSpace : limit;
  return [text.slice(0, cut).trimEnd(), text.slice(cut).trimStart()];
}

const AcompanhamentoBike = ({ initial }: { initial: RadarBikeData }) => {
  const base = useRadarBase();
  const { bikeId = "" } = useParams();
  const [window, setWindow] = useState<DailyWindow>(30);
  // Dados reais vêm do loader (SSR + hidratação; reexecuta ao trocar de bike).
  const bike: RadarBikeDetail | null = initial.ok ? ((initial.bike as RadarBikeDetail | null) ?? null) : null;
  const error = !initial.ok;
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    if (bike) trackRadar("radar_detail_viewed", { bike_id: bike.id });
  }, [bike]);

  // Preço e link só existem juntos, vindos da mesma oferta atual válida.
  const currentPrice =
    typeof bike?.currentPrice === "number" && Number.isFinite(bike.currentPrice) && bike.currentPrice > 0
      ? bike.currentPrice
      : null;
  const link = typeof bike?.link === "string" && isSafePurchaseLink(bike.link) ? bike.link : null;
  const hasOffer = currentPrice !== null && link !== null;

  const metrics = useMemo(
    () =>
      bike && currentPrice !== null
        ? dailyMetrics({ daily: bike.daily ?? [], currentPrice }, window)
        : null,
    [bike, currentPrice, window],
  );

  // Série completa para o histórico arquivado (sem classificação, sem preço atual).
  const archivedSeries = useMemo(
    () => (bike && !hasOffer ? expandDaily(bike.daily ?? [], "all") : []),
    [bike, hasOffer],
  );
  const archivedCounts = useMemo(() => {
    const real = archivedSeries.filter((p) => p.verification !== "missing");
    return {
      verified: real.filter((p) => p.verification === "observed_change" || p.verification === "confirmed_unchanged").length,
      reconstructed: real.filter((p) => p.verification === "reconstructed").length,
      firstDay: real[0]?.date ?? null,
    };
  }, [archivedSeries]);

  // Data do último preço VERIFICADO (confirmação diária). `lastObservedAt` é a
  // última ALTERAÇÃO de preço e só aparece rotulada como tal.
  const lastConfirmed = useMemo(() => lastConfirmedDay(archivedSeries), [archivedSeries]);

  const loading = false; // dados já chegam no SSR
  const canBuy = hasOffer;
  const strengths = (bike?.strengths ?? []).filter((s) => typeof s === "string").slice(0, 4);
  const description = initial.catalogBike?.description || bike?.description || bike?.shortDescription || null;
  const [descriptionLead, descriptionRest] = description ? splitDescription(description) : ["", ""];
  // A ficha reúne somente atributos presentes nas fontes públicas desta bike.
  const specs = [
    bike?.autonomyKm ? { label: "Autonomia", value: `Até ${bike.autonomyKm} km` } : null,
    bike?.capacity ? { label: "Capacidade", value: `${bike.capacity} pessoa(s)` } : null,
    bike?.weightSupportKg ? { label: "Suporta até", value: `${bike.weightSupportKg} kg` } : null,
    bike?.terrains?.length ? { label: "Terrenos", value: bike.terrains.filter((t) => typeof t === "string").slice(0, 3).map((t) => t.replace(/_/g, " ")).join(", ") } : null,
    initial.catalogBike?.category ? { label: "Categoria", value: initial.catalogBike.category } : null,
  ].filter((x): x is { label: string; value: string } => !!x && !!x.value);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="responsive-container py-6 md:py-10">
        <nav aria-label="Trilha" className="text-sm text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-action">Início</Link></li>
            <li aria-hidden="true">›</li>
            <li><Link to={base} className="hover:text-action">Radar de preços</Link></li>
            {bike && (<><li aria-hidden="true">›</li><li aria-current="page" className="font-medium text-ink">{bike.name}</li></>)}
          </ol>
        </nav>

        {loading && (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-[420px] w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        )}

        {!loading && error && (
          <p className="mt-8 rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            Radar de preços temporariamente indisponível. Tente recarregar em alguns minutos.
          </p>
        )}

        {!loading && !error && !bike && (
          <p className="mt-8 rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            Não encontramos acompanhamento para esta bike no momento.
          </p>
        )}

        {!loading && bike && (
          <>
            <header className="mt-4 grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
              <BikeMedia src={bike.image} name={bike.name} eager className="h-[240px] rounded-3xl border border-line sm:h-[280px]" />

              <div className="flex min-w-0 flex-col">
                {/* Sem selo de avaliação de preço: só status factual de oferta/histórico. */}
                {!(hasOffer && metrics) && (
                  <span className="inline-flex w-fit items-center rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted-foreground">
                    Sem oferta no momento
                  </span>
                )}
                <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight text-ink md:text-4xl">{bike.name}</h1>

                {hasOffer && metrics ? (
                  <>
                    <p className="mt-3 text-4xl font-extrabold tracking-tight text-action md:text-5xl">{formatBRL(currentPrice)}</p>
                    {metrics.deltaAbs !== null && metrics.deltaAbs !== 0 && (
                      <p className={`mt-2 inline-flex w-fit rounded-lg px-3 py-1 text-sm font-semibold ${metrics.deltaAbs < 0 ? "bg-mint/25 text-ink" : "bg-destructive/10 text-destructive"}`}>
                        {metrics.deltaAbs < 0 ? "▼" : "▲"} {formatBRL(Math.abs(metrics.deltaAbs))} ({Math.abs(metrics.deltaPct ?? 0).toFixed(1).replace(".", ",")}%) desde o preço anterior
                      </p>
                    )}

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {canBuy && link && (
                        <a
                          href={link}
                          target="_blank"
                          rel="noopener noreferrer nofollow sponsored"
                          onClick={() => { trackRadar("radar_ml_click", { bike_id: bike.id, position: "detail" }); trackAffiliateClick({ bike_id: bike.id, position: "radar_detail" }); }}
                          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-4 font-bold text-primary-foreground hover:opacity-90"
                        >
                          Ver oferta no Mercado Livre <ExternalLink className="h-4 w-4" aria-hidden="true" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          trackRadar("radar_alert_opened", { bike_id: bike.id, source: "detail" });
                          setAlertOpen(true);
                        }}
                        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line px-4 font-semibold text-ink hover:bg-surface"
                      >
                        <BellRing className="h-4 w-4" aria-hidden="true" /> Registrar alerta de preço
                      </button>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Link de afiliado. Preço e disponibilidade podem mudar no Mercado Livre. O envio automático de alertas ainda não está ativo.
                    </p>
                  </>
                ) : (
                  /* Sem oferta atual: mantemos o último preço REAL registrado, rotulado como histórico.
                     Sem farol, sem CTA de compra e sem alerta que prometa oferta. */
                  <div className="mt-5 rounded-2xl border border-line bg-surface p-4">
                    <p className="text-sm font-semibold text-muted-foreground">Último preço verificado</p>
                    {typeof bike.lastObservedPrice === "number" && bike.lastObservedPrice > 0 ? (
                      <p className="mt-1 text-3xl font-extrabold tracking-tight text-ink md:text-4xl">
                        {formatBRL(bike.lastObservedPrice)}
                      </p>
                    ) : (
                      <p className="mt-1 text-sm text-muted-foreground">Não temos preço registrado para este modelo.</p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">
                      Sem oferta disponível no Mercado Livre no momento.
                      {lastConfirmed
                        ? ` Confirmado pela Vitale em ${formatDateBR(lastConfirmed.date)}; pode não ser o preço de hoje.`
                        : bike.lastObservedAt
                          ? ` Última alteração de preço registrada em ${formatDateBR(bike.lastObservedAt)}; pode não ser o preço de hoje.`
                          : ""}
                    </p>
                    {lastConfirmed && bike.lastObservedAt && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Última alteração de preço registrada em {formatDateBR(bike.lastObservedAt)}.
                      </p>
                    )}
                    <UnavailableExplainer dateISO={lastConfirmed?.date ?? bike.lastObservedAt} className="mt-3" />
                  </div>
                )}


              </div>
            </header>

            {hasOffer && metrics && currentPrice !== null ? (
              <PriceIntelPanel
                currentPrice={currentPrice}
                metrics={metrics}
                window={window}
                onWindowChange={(w) => {
                  setWindow(w);
                  trackRadar("radar_period_changed", { bike_id: bike.id, period: String(w) });
                }}
                firstObservedAt={bike.firstObservedAt}
                lastObservedAt={bike.lastObservedAt}
              />
            ) : (
              archivedSeries.length > 0 && (
                <section aria-labelledby="hist-arquivado" className="mt-8 overflow-hidden rounded-2xl border border-line bg-card">
                  <div className="border-b border-line px-4 py-4 sm:px-6">
                    <h2 id="hist-arquivado" className="text-lg font-bold text-ink">Histórico registrado</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Sem oferta atual, não classificamos se o preço está bom ou caro. Abaixo está apenas o que já
                      registramos: {archivedCounts.verified} dia(s) confirmados e {archivedCounts.reconstructed}{" "}
                      reconstruído(s)
                      {archivedCounts.firstDay && `, desde ${formatDateBR(archivedCounts.firstDay)}`}.
                    </p>
                  </div>
                  <div className="px-4 py-4 sm:px-6">
                    <DailyPriceChart series={archivedSeries} compact markLastUnavailable />
                    <div className="mt-2"><UnavailableExplainer dateISO={lastConfirmed?.date ?? bike.lastObservedAt} label="Entenda a indisponibilidade" /></div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      A linha liga preços disponíveis, sem criar valores para dias sem verificação.
                    </p>
                  </div>
                </section>
              )
            )}




            {(specs.length > 0 || strengths.length > 0) && (
              <section className="mt-8" aria-labelledby="destaques">
                <SectionHeading id="destaques" title="Ficha em destaque" />
                {specs.length > 0 && (
                  <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                    {specs.map((sp) => (
                      <div key={sp.label} className="rounded-xl border border-line bg-surface px-4 py-3">
                        <dt className="text-sm text-muted-foreground">{sp.label}</dt>
                        <dd className="font-bold text-ink">{sp.value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {strengths.length > 0 && <>
                  <h3 className="mt-6 text-lg font-bold text-ink">Pontos da ficha</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {strengths.map((s) => (
                      <li key={s} className="flex items-start gap-2 rounded-xl border border-line bg-card p-4">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-action" aria-hidden="true" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </>}
              </section>
            )}

            {(bike.perfilIndicado || description || bike.diferencial) && (
              <section className="mt-10" aria-labelledby="sobre-bike">
                <SectionHeading id="sobre-bike" title={`Conheça a ${bike.name}`} />
                {bike.perfilIndicado && <p className="mt-5 max-w-none text-base leading-relaxed text-ink"><strong>Boa para:</strong> {bike.perfilIndicado}</p>}
                {description && <div className="mt-4 max-w-none text-base leading-relaxed text-muted-foreground">
                  <div className="space-y-3">{descriptionLead.split(/\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                  {descriptionRest && <details className="mt-3">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">Ver mais sobre a {bike.name}</summary>
                    <div className="mt-2 space-y-3">{descriptionRest.split(/\n+/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
                  </details>}
                </div>}
                {bike.diferencial && <p className="mt-4 max-w-none text-base leading-relaxed text-muted-foreground"><strong className="text-ink">Diferencial:</strong> {bike.diferencial}</p>}
              </section>
            )}

            {initial.catalogBike && initial.comparisonBikes.length > 0 && (
              <BikeHubComparison key={bike.id} bike={initial.catalogBike} alternatives={initial.comparisonBikes} />
            )}

            <div className="mt-12"><QuizBanner /></div>

            {initial.videos?.length > 0 && (
              <section className="mt-12" aria-labelledby="bike-videos">
                <SectionHeading id="bike-videos" title="Vídeos deste modelo" />
                <VideoCards videos={initial.videos.slice(0, 4)} className="mt-4" />
                {initial.videos.length > 4 && (
                  <details className="mt-4">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center rounded-xl border border-line px-4 text-sm font-semibold text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">
                      Ver mais vídeos deste modelo ({initial.videos.length - 4})
                    </summary>
                    <VideoCards videos={initial.videos.slice(4)} className="mt-4" />
                  </details>
                )}
              </section>
            )}

            {initial.articles?.length > 0 && (
              <section className="mt-12" aria-labelledby="bike-articles">
                <SectionHeading
                  id="bike-articles"
                  title="Artigos sobre este modelo"
                  action={<Link to="/conteudos" className="inline-flex items-center gap-1 hover:underline">Ver todos os artigos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>}
                />
                <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {initial.articles.map((article) => (
                    <li key={article.id}>
                      <Link
                        to={`/conteudos/${encodeURIComponent(article.slug)}`}
                        className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-card transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
                      >
                        {article.ogImageUrl ? (
                          <img src={article.ogImageUrl} alt="" width={640} height={360} loading="lazy" decoding="async" className="aspect-video w-full object-cover" />
                        ) : (
                          <div className="grid aspect-video place-items-center bg-surface">
                            <BookOpen className="h-10 w-10 text-action" aria-hidden="true" />
                          </div>
                        )}
                        <div className="flex flex-1 flex-col p-5">
                          <h3 className="text-lg font-bold text-ink group-hover:text-action">{article.title}</h3>
                          {article.summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>}
                          <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-action">
                            Ler artigo <ArrowRight className="h-4 w-4" aria-hidden="true" />
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="mt-12">
              <OffersGroupCta source="radar_detail" />
            </div>

          </>
        )}
      </main>

      {/* Alerta só existe com preço atual de referência. */}
      {bike && hasOffer && currentPrice !== null && (
        <PriceAlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          bikeId={bike.id}
          bikeName={bike.name}
          currentPrice={currentPrice}
        />
      )}

      <SiteFooter />
    </div>
  );
};

export default AcompanhamentoBike;
