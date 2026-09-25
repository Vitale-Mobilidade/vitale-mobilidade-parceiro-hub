import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { ArrowRight, BellRing, Check, ExternalLink } from "lucide-react";
import type { RadarBikeData } from "@/lib/radar-routes";
import { useRadarBase } from "@/lib/radar-base";
import { VideoCards } from "@/components/site/VideoCards";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader, SiteFooter, BikeMedia, SectionHeading } from "@/components/site/site-ui";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { OffersGroupCta } from "@/components/radar/OffersGroupCta";
import { PriceAlertDialog } from "@/components/radar/PriceAlertDialog";
import { PriceIntelPanel } from "@/components/radar/PriceIntelPanel";
import { UnavailableExplainer } from "@/components/radar/UnavailableExplainer";
import { UNAVAILABLE_LEGEND, lastConfirmedDay } from "@/lib/radar-unavailable";
import { formatBRL, formatDateBR, isSafePurchaseLink } from "@/lib/price-tracker";
import { dailyMetrics, expandDaily, type DailyPoint, type DailyWindow } from "@/lib/price-daily";
import { trackRadar } from "@/lib/radar-analytics";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import { radarCompareHref } from "@/lib/bike-compare";

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
  // Descrições legadas (slogans) não são exibidas; só campos factuais.
  const specs = [
    bike?.autonomyKm ? { label: "Autonomia", value: `Até ${bike.autonomyKm} km` } : null,
    bike?.capacity ? { label: "Capacidade", value: `${bike.capacity} pessoa(s)` } : null,
    bike?.weightSupportKg ? { label: "Suporta até", value: `${bike.weightSupportKg} kg` } : null,
    bike?.terrains?.length ? { label: "Terrenos", value: bike.terrains.filter((t) => typeof t === "string").slice(0, 3).map((t) => t.replace(/_/g, " ")).join(", ") } : null,
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
            <header className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <BikeMedia src={bike.image} name={bike.name} eager className="h-[260px] rounded-3xl border border-line md:h-[340px]" />

              <div className="flex min-w-0 flex-col">
                {/* Sem selo de avaliação de preço: só status factual de oferta/histórico. */}
                {!(hasOffer && metrics) && (
                  <span className="inline-flex w-fit items-center rounded-full bg-surface px-3 py-1 text-xs font-bold text-muted-foreground">
                    Sem oferta no momento
                  </span>
                )}
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-ink md:text-4xl">{bike.name}</h1>
                {bike.perfilIndicado && <p className="mt-2 text-base text-muted-foreground">Boa para: {bike.perfilIndicado}</p>}
                <a href={radarCompareHref([bike.id])} className="mt-2 w-fit text-sm font-bold text-action hover:underline">Comparar com outra bike →</a>

                {hasOffer && metrics ? (
                  <>
                    <p className="mt-5 text-4xl font-extrabold tracking-tight text-action md:text-5xl">{formatBRL(currentPrice)}</p>
                    {metrics.deltaAbs !== null && metrics.deltaAbs !== 0 && (
                      <p className={`mt-2 inline-flex w-fit rounded-lg px-3 py-1 text-sm font-semibold ${metrics.deltaAbs < 0 ? "bg-mint/25 text-ink" : "bg-destructive/10 text-destructive"}`}>
                        {metrics.deltaAbs < 0 ? "▼" : "▲"} {formatBRL(Math.abs(metrics.deltaAbs))} ({Math.abs(metrics.deltaPct ?? 0).toFixed(1).replace(".", ",")}%) desde o preço anterior
                      </p>
                    )}

                    <div className="mt-6 grid gap-3 sm:grid-cols-2">
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


                {specs.length > 0 && (
                  <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {specs.map((sp) => (
                      <div key={sp.label} className="rounded-xl border border-line bg-surface px-4 py-3">
                        <dt className="text-sm text-muted-foreground">{sp.label}</dt>
                        <dd className="font-bold text-ink">{sp.value}</dd>
                      </div>
                    ))}
                  </dl>
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
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive">
                        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-destructive" />
                        {UNAVAILABLE_LEGEND}
                      </span>
                      <UnavailableExplainer dateISO={lastConfirmed?.date ?? bike.lastObservedAt} label="Entenda o ponto vermelho" />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Ponto cheio: dia verificado. Ponto vazado: dia reconstruído do histórico. Espaços vazios são dias
                      sem verificação — nunca repetimos um preço que não confirmamos.
                    </p>
                  </div>
                </section>
              )
            )}




            <section aria-labelledby="combina" className="relative isolate mt-12 overflow-hidden rounded-3xl bg-ink text-ink-foreground">
              <picture>
                <source media="(max-width: 767px)" srcSet="/vitale-hero-mobile.webp" width={480} height={728} />
                <img src="/vitale-hero-1280.webp" width={1280} height={720} alt="" loading="lazy" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
              </picture>
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/30 max-md:bg-ink/80" aria-hidden="true" />
              <div className="max-w-xl p-6 sm:p-10">
                <h2 id="combina" className="text-3xl font-extrabold leading-tight sm:text-4xl">Essa bike combina com você?</h2>
                <p className="mt-3 text-ink-foreground/90">
                  Responda o quiz da Vitale sobre seu uso, trajeto e orçamento e veja qual bike é recomendada para o seu perfil.
                </p>
                <Link to="/escolherbike" className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90">
                  Fazer o quiz <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            </section>

            {strengths.length > 0 && (
              <section className="mt-12" aria-labelledby="destaques">
                <SectionHeading id="destaques" title="Pontos da ficha" />
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {strengths.map((s) => (
                    <li key={s} className="flex items-start gap-2 rounded-xl border border-line bg-card p-4">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-action" aria-hidden="true" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {initial.videos?.length > 0 && (
              <section className="mt-12" aria-labelledby="bike-videos">
                <SectionHeading id="bike-videos" title="Vídeos deste modelo" />
                <VideoCards videos={initial.videos} className="mt-4" />
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
