import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, BellRing, Check, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import { DailyPriceChart } from "@/components/radar/DailyPriceChart";
import { OffersGroupCta } from "@/components/radar/OffersGroupCta";
import { PriceAlertDialog } from "@/components/radar/PriceAlertDialog";
import { PriceRangeBar } from "@/components/radar/PriceRangeBar";
import { CLASSIFICATION_LABEL, formatBRL, formatDateBR, formatDateTimeBR, isSafePurchaseLink } from "@/lib/price-tracker";
import { dailyMetrics, DAILY_WINDOWS, WINDOW_LABEL, type DailyPoint, type DailyWindow } from "@/lib/price-daily";
import { CLASSIFICATION_COLOR } from "@/lib/radar-rankings";
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

function Spec({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="rounded-xl bg-green-50/60 px-4 py-3">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold">{value}</dd>
    </div>
  );
}

const AcompanhamentoBike = () => {
  const { bikeId = "" } = useParams();
  const [window, setWindow] = useState<DailyWindow>(30);
  const [bike, setBike] = useState<RadarBikeDetail | null | undefined>(undefined);
  const [error, setError] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBike(undefined);
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_bike_price_history", {
        p_bike_id: bikeId,
        p_days: 0, // série completa: a janela é aplicada no cliente
      });
      if (cancelled) return;
      if (rpcError) {
        setError(true);
        setBike(null);
        return;
      }
      setError(false);
      setBike((data as unknown as RadarBikeDetail) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [bikeId]);

  useEffect(() => {
    if (bike) trackRadar("radar_detail_viewed", { bike_id: bike.id });
  }, [bike]);

  const metrics = useMemo(
    () => (bike ? dailyMetrics({ daily: bike.daily ?? [], currentPrice: bike.currentPrice }, window) : null),
    [bike, window],
  );

  const loading = bike === undefined;
  const canBuy = !!bike && isSafePurchaseLink(bike.link);
  const strengths = (bike?.strengths ?? []).filter((s) => typeof s === "string").slice(0, 4);
  const goodFor = bike?.shortDescription || bike?.perfilIndicado || bike?.description || null;

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>
          {bike ? `${bike.name} — histórico de preços | Vitale Mobilidade` : "Histórico de preços | Vitale Mobilidade"}
        </title>
        <meta
          name="description"
          content={
            bike
              ? `${bike.name}: preço de hoje ${formatBRL(bike.currentPrice)} e histórico real registrado pela Vitale Mobilidade.`
              : "Histórico real de preços de bikes elétricas acompanhado pela Vitale Mobilidade."
          }
        />
        <link rel="canonical" href={`https://vitalemobilidade.com/acompanhamento/${bikeId}`} />
        {bike && <meta property="og:title" content={`${bike.name} — histórico de preços`} />}
        {bike && <meta property="og:type" content="product" />}
        {bike?.image && <meta property="og:image" content={bike.image} />}
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <main className="responsive-container py-8 md:py-12">
        <Link
          to="/acompanhamento"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para o Radar de Preços
        </Link>

        {loading && (
          <div className="mt-6 space-y-4">
            <Skeleton className="h-[420px] w-full rounded-3xl" />
            <Skeleton className="h-72 w-full rounded-3xl" />
          </div>
        )}

        {!loading && (error || !bike) && (
          <p className="mt-8 rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            Não encontramos acompanhamento para esta bike no momento.
          </p>
        )}

        {!loading && bike && metrics && (
          <>
            <header className="mt-6 grid gap-8 lg:grid-cols-2">
              <div className="flex h-[320px] items-center justify-center overflow-hidden rounded-3xl bg-green-50/70 md:h-[460px]">
                {bike.image ? (
                  <img
                    src={bike.image}
                    alt={`Bike elétrica ${bike.name}`}
                    className="h-full w-full object-contain p-4"
                    decoding="async"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Imagem indisponível</span>
                )}
              </div>

              <div className="flex flex-col justify-center">
                <Badge className={`w-fit border-0 ${CLASSIFICATION_COLOR[metrics.classification]}`}>
                  {CLASSIFICATION_LABEL[metrics.classification]}
                </Badge>
                <h1 className="mt-3 text-2xl font-bold leading-tight tracking-tight md:text-4xl">{bike.name}</h1>
                {goodFor && <p className="mt-3 text-sm text-muted-foreground md:text-base">Boa para: {goodFor}</p>}

                <p className="mt-5 text-4xl font-bold tracking-tight text-primary md:text-5xl">
                  {formatBRL(bike.currentPrice)}
                </p>
                {metrics.deltaAbs !== null && metrics.deltaAbs !== 0 && (
                  <p className={`mt-1 text-sm font-medium ${metrics.deltaAbs < 0 ? "text-primary" : "text-destructive"}`}>
                    {metrics.deltaAbs < 0 ? "▼" : "▲"} {formatBRL(Math.abs(metrics.deltaAbs))} (
                    {Math.abs(metrics.deltaPct ?? 0).toFixed(1)}%) desde o preço anterior
                  </p>
                )}

                {strengths.length > 0 && (
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {strengths.map((s) => (
                      <li key={s} className="flex items-start gap-2 text-sm">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  {canBuy && (
                    <Button asChild size="lg" className="min-h-12 flex-1 bg-gradient-green text-white hover:opacity-90">
                      <a
                        href={bike.link}
                        target="_blank"
                        rel="noopener noreferrer nofollow sponsored"
                        onClick={() => trackRadar("radar_ml_click", { bike_id: bike.id, position: "detail" })}
                      >
                        Ver oferta no Mercado Livre <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="lg"
                    variant="outline"
                    className="min-h-12 flex-1"
                    onClick={() => {
                      trackRadar("radar_alert_opened", { bike_id: bike.id, source: "detail" });
                      setAlertOpen(true);
                    }}
                  >
                    <BellRing className="mr-2 h-4 w-4" aria-hidden="true" /> Quero ser avisado quando baixar
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Link de afiliado. Preço e disponibilidade podem mudar no Mercado Livre.
                </p>
              </div>
            </header>

            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
              <PriceRangeBar currentPrice={bike.currentPrice} metrics={metrics} />

              <div className="rounded-2xl border border-border/60 bg-white p-6 shadow-sm">
                <h2 className="text-lg font-semibold">Resumo do período</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Menor verificado</p>
                    <p className="text-xl font-bold text-primary">{formatBRL(metrics.minPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Maior verificado</p>
                    <p className="text-xl font-bold">{formatBRL(metrics.maxPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Preço típico</p>
                    <p className="text-xl font-bold">{formatBRL(metrics.typicalPrice)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cobertura</p>
                    <p className="text-xl font-bold">
                      {metrics.verifiedDays} de {metrics.expectedDays} dias
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-muted-foreground">
                  Acompanhando desde {formatDateBR(bike.firstObservedAt)} · última verificação em{" "}
                  {formatDateTimeBR(metrics.lastVerifiedAt ?? bike.lastObservedAt)}.
                  {metrics.reconstructedDays > 0 &&
                    ` ${metrics.reconstructedDays} dia(s) do período foram reconstruídos do histórico.`}
                </p>
              </div>
            </div>

            <section className="mt-10" aria-label="Histórico diário de preços">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold md:text-xl">Histórico diário</h2>
                <div className="inline-flex rounded-xl border border-border p-1" role="group" aria-label="Período do gráfico">
                  {DAILY_WINDOWS.map((w) => (
                    <button
                      key={String(w)}
                      type="button"
                      onClick={() => {
                        setWindow(w);
                        trackRadar("radar_period_changed", { bike_id: bike.id, period: String(w) });
                      }}
                      aria-pressed={window === w}
                      className={`min-h-10 rounded-lg px-3 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        window === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {WINDOW_LABEL[String(w)]}
                    </button>
                  ))}
                </div>
              </div>
              <DailyPriceChart series={metrics.series} />
              <p className="mt-2 text-xs text-muted-foreground">
                Linha contínua: dias verificados. Tracejado: dias reconstruídos do histórico. Espaços vazios são dias sem
                verificação — nunca repetimos um preço que não confirmamos.
              </p>
            </section>

            {(bike.autonomyKm || bike.capacity || bike.weightSupportKg || bike.diferencial) && (
              <section className="mt-10" aria-label="Ficha da bike">
                <h2 className="mb-3 text-lg font-semibold md:text-xl">Sobre esta bike</h2>
                {bike.diferencial && <p className="mb-4 text-sm text-muted-foreground">{bike.diferencial}</p>}
                <dl className="grid gap-3 sm:grid-cols-3">
                  <Spec label="Autonomia" value={bike.autonomyKm ? `Até ${bike.autonomyKm} km` : null} />
                  <Spec label="Capacidade" value={bike.capacity ? `${bike.capacity} pessoa(s)` : null} />
                  <Spec label="Suporta até" value={bike.weightSupportKg ? `${bike.weightSupportKg} kg` : null} />
                </dl>
              </section>
            )}

            <div className="mt-10">
              <OffersGroupCta source="radar_detail" />
            </div>

            <section className="mt-8 rounded-2xl border border-border/60 bg-green-50/40 p-5 text-sm text-muted-foreground">
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

      <Footer />
    </div>
  );
};

export default AcompanhamentoBike;
