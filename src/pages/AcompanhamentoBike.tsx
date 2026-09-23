import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "@/lib/router-compat";
import { ArrowRight, BellRing, Check, ExternalLink } from "lucide-react";
import { useLoaderData } from "@tanstack/react-router";
import { VideoCards } from "@/components/site/VideoCards";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteHeader, SiteFooter, BikeMedia, PriceStatus, SectionHeading } from "@/components/site/site-ui";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { OffersGroupCta } from "@/components/radar/OffersGroupCta";
import { PriceAlertDialog } from "@/components/radar/PriceAlertDialog";
import { PriceRangeBar } from "@/components/radar/PriceRangeBar";
import { formatBRL, formatDateBR, formatDateTimeBR, isSafePurchaseLink } from "@/lib/price-tracker";
import { dailyMetrics, DAILY_WINDOWS, WINDOW_LABEL, type DailyPoint, type DailyWindow } from "@/lib/price-daily";
import { trackRadar } from "@/lib/radar-analytics";

interface RadarBikeDetail {
  id: string;
  name: string;
  currentPrice: number;
  link: string;
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

const AcompanhamentoBike = () => {
  const { bikeId = "" } = useParams();
  const [window, setWindow] = useState<DailyWindow>(30);
  // Dados reais vêm do loader (SSR + hidratação; reexecuta ao trocar de bike).
  const initial = useLoaderData({ from: "/acompanhamento/$bikeId" });
  const bike: RadarBikeDetail | null = initial.ok ? ((initial.bike as RadarBikeDetail | null) ?? null) : null;
  const error = !initial.ok;
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    if (bike) trackRadar("radar_detail_viewed", { bike_id: bike.id });
  }, [bike]);

  const metrics = useMemo(
    () => (bike ? dailyMetrics({ daily: bike.daily ?? [], currentPrice: bike.currentPrice }, window) : null),
    [bike, window],
  );

  const loading = false; // dados já chegam no SSR
  const canBuy = !!bike && isSafePurchaseLink(bike.link);
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
            <li><Link to="/acompanhamento" className="hover:text-action">Radar de preços</Link></li>
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

        {!loading && bike && metrics && (
          <>
            <header className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <BikeMedia src={bike.image} name={bike.name} eager className="h-[300px] rounded-3xl border border-line md:h-[440px]" />

              <div className="flex min-w-0 flex-col">
                <PriceStatus classification={metrics.classification} />
                <h1 className="mt-3 text-3xl font-extrabold leading-tight tracking-tight text-ink md:text-4xl">{bike.name}</h1>
                {bike.perfilIndicado && <p className="mt-2 text-base text-muted-foreground">Boa para: {bike.perfilIndicado}</p>}

                <p className="mt-5 text-4xl font-extrabold tracking-tight text-action md:text-5xl">{formatBRL(bike.currentPrice)}</p>
                {metrics.deltaAbs !== null && metrics.deltaAbs !== 0 && (
                  <p className={`mt-2 inline-flex w-fit rounded-lg px-3 py-1 text-sm font-semibold ${metrics.deltaAbs < 0 ? "bg-mint/25 text-ink" : "bg-destructive/10 text-destructive"}`}>
                    {metrics.deltaAbs < 0 ? "▼" : "▲"} {formatBRL(Math.abs(metrics.deltaAbs))} ({Math.abs(metrics.deltaPct ?? 0).toFixed(1).replace(".", ",")}%) desde o preço anterior
                  </p>
                )}

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {canBuy && (
                    <a
                      href={bike.link}
                      target="_blank"
                      rel="noopener noreferrer nofollow sponsored"
                      onClick={() => trackRadar("radar_ml_click", { bike_id: bike.id, position: "detail" })}
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

            <div className="mt-12 grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
              <PriceRangeBar currentPrice={bike.currentPrice} metrics={metrics} />

              <div className="rounded-2xl border border-line bg-card p-6">
                <h2 className="text-lg font-bold text-ink">Resumo do período ({WINDOW_LABEL[String(window)]})</h2>
                <dl className="mt-4 divide-y divide-line">
                  {[
                    ["Menor verificado", formatBRL(metrics.minPrice)],
                    ["Preço típico", formatBRL(metrics.typicalPrice)],
                    ["Maior verificado", formatBRL(metrics.maxPrice)],
                    ["Cobertura", `${metrics.verifiedDays} de ${metrics.expectedDays} dias`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-3 py-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-bold text-ink">{v}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-3 text-sm text-muted-foreground">
                  Acompanhando desde {formatDateBR(bike.firstObservedAt)} · última verificação em{" "}
                  {formatDateTimeBR(metrics.lastVerifiedAt ?? bike.lastObservedAt)}.
                  {metrics.reconstructedDays > 0 &&
                    ` ${metrics.reconstructedDays} dia(s) do período foram reconstruídos do histórico.`}
                </p>
              </div>
            </div>

            <section className="mt-12" aria-labelledby="historico">
              <div className="mb-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <SectionHeading id="historico" title="Histórico de preços" sub="Preços diários registrados pela Vitale para esta bike." />
                <div className="inline-flex flex-wrap rounded-xl border border-line p-1" role="group" aria-label="Período do gráfico">
                  {DAILY_WINDOWS.map((w) => (
                    <button
                      key={String(w)}
                      type="button"
                      onClick={() => {
                        setWindow(w);
                        trackRadar("radar_period_changed", { bike_id: bike.id, period: String(w) });
                      }}
                      aria-pressed={window === w}
                      className={`min-h-10 rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action ${
                        window === w ? "bg-action text-primary-foreground" : "text-muted-foreground hover:bg-surface"
                      }`}
                    >
                      {WINDOW_LABEL[String(w)]}
                    </button>
                  ))}
                </div>
              </div>
              <DailyPriceChart series={metrics.series} />
              <p className="mt-2 text-sm text-muted-foreground">
                Ponto cheio: dia verificado. Ponto vazado: dia reconstruído do histórico. Espaços vazios são dias sem
                verificação — nunca repetimos um preço que não confirmamos.
              </p>
            </section>

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

            <section className="mt-8 rounded-2xl border border-line bg-surface p-5 text-sm text-muted-foreground">
              <h2 className="mb-2 text-base font-semibold text-foreground">Como lemos esses números</h2>
              <p>
                A cada verificação bem-sucedida registramos o preço vigente do dia. O preço típico é a mediana dos
                fechamentos diários do período e a faixa típica vai do percentil 25 ao 75. A leitura compara o preço de
                hoje com esse histórico registrado pela Vitale — nunca com outras lojas.
              </p>
              <p className="mt-2">
                Com menos de 14 dias verificados, cobertura abaixo de 80% ou apenas um preço, dizemos honestamente que o
                histórico ainda está em formação.
              </p>
            </section>
          </>
        )}
      </main>

      {bike && (
        <PriceAlertDialog
          open={alertOpen}
          onOpenChange={setAlertOpen}
          bikeId={bike.id}
          bikeName={bike.name}
          currentPrice={bike.currentPrice}
        />
      )}

      <SiteFooter />
    </div>
  );
};

export default AcompanhamentoBike;
