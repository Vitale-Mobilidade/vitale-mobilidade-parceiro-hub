import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, ExternalLink } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Footer from "@/components/Footer";
import {
  CLASSIFICATION_HINT,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_TONE,
  computeStats,
  formatBRL,
  formatDateBR,
  formatDateTimeBR,
  isSafePurchaseLink,
  WINDOWS,
  type TrackerBike,
  type WindowDays,
} from "@/lib/price-tracker";

function Metric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-white p-4">
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-lg font-semibold">{value}</dd>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const AcompanhamentoBike = () => {
  const { bikeId = "" } = useParams();
  const [days, setDays] = useState<WindowDays>(30);
  const [bike, setBike] = useState<TrackerBike | null | undefined>(undefined);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBike(undefined);
    (async () => {
      const { data, error: rpcError } = await supabase.rpc("get_bike_price_history", {
        p_bike_id: bikeId,
        p_days: days,
      });
      if (cancelled) return;
      if (rpcError) {
        setError(true);
        setBike(null);
        return;
      }
      setError(false);
      setBike((data as unknown as TrackerBike) ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [bikeId, days]);

  const stats = useMemo(() => (bike ? computeStats(bike, days) : null), [bike, days]);

  const chartData = useMemo(
    () =>
      (stats?.series ?? []).map((p) => ({
        t: new Date(p.t).getTime(),
        label: formatDateBR(p.t),
        price: p.price,
      })),
    [stats],
  );

  const loading = bike === undefined;
  const canBuy = !!bike && isSafePurchaseLink(bike.link);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>{bike ? `Histórico de preços — ${bike.name} | Vitale Mobilidade` : "Histórico de preços | Vitale Mobilidade"}</title>
        <meta
          name="description"
          content={
            bike
              ? `Histórico real de preços da bike elétrica ${bike.name}, com mínimo, máximo e preço típico registrados.`
              : "Histórico real de preços de bikes elétricas acompanhado pela Vitale Mobilidade."
          }
        />
        <link rel="canonical" href={`https://vitalemobilidade.com/acompanhamento/${bikeId}`} />
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
            <Skeleton className="h-40 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        )}

        {!loading && (error || !bike) && (
          <p className="mt-8 rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
            Não encontramos acompanhamento para esta bike no momento.
          </p>
        )}

        {!loading && bike && stats && (
          <>
            <header className="mt-6 grid gap-6 md:grid-cols-[240px,1fr]">
              <div className="flex h-52 items-center justify-center overflow-hidden rounded-2xl bg-green-50/60">
                {bike.image ? (
                  <img
                    src={bike.image}
                    alt={`Bike elétrica ${bike.name}`}
                    className="h-full w-full object-contain"
                    decoding="async"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Imagem indisponível</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold md:text-3xl">{bike.name}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <p className="text-3xl font-bold text-primary">{formatBRL(bike.currentPrice)}</p>
                  <Badge className={`border-0 ${CLASSIFICATION_TONE[stats.classification]}`}>
                    {CLASSIFICATION_LABEL[stats.classification]}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {CLASSIFICATION_HINT[stats.classification]}{" "}
                  {stats.firstObservedAt && `Com base no histórico registrado desde ${formatDateBR(stats.firstObservedAt)}.`}
                </p>

                {canBuy && (
                  <div className="mt-5">
                    <Button asChild size="lg" className="bg-gradient-green text-white hover:opacity-90">
                      <a href={bike.link} target="_blank" rel="noopener noreferrer nofollow sponsored">
                        Ver oferta no Mercado Livre <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />
                      </a>
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">
                      Preço e disponibilidade podem mudar no Mercado Livre.
                    </p>
                  </div>
                )}
              </div>
            </header>

            <section className="mt-8" aria-label="Gráfico do histórico de preços">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">Histórico de preços</h2>
                <div className="inline-flex rounded-lg border border-border p-1" role="group" aria-label="Período do gráfico">
                  {WINDOWS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setDays(w)}
                      aria-pressed={days === w}
                      className={`rounded-md px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        days === w ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      {w} dias
                    </button>
                  ))}
                </div>
              </div>

              {chartData.length === 0 ? (
                <p className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
                  Ainda não registramos preços nesse período.
                </p>
              ) : (
                <div className="h-72 w-full rounded-2xl border border-border/60 bg-white p-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={24} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        width={70}
                        domain={["auto", "auto"]}
                        tickFormatter={(v: number) => formatBRL(v)}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatBRL(v), "Preço"]}
                        labelFormatter={(l: string) => `Observado em ${l}`}
                      />
                      <Line
                        type="stepAfter"
                        dataKey="price"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        isAnimationActive={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Metric label="Menor preço observado" value={formatBRL(stats.minObserved)} />
              <Metric label="Maior preço observado" value={formatBRL(stats.maxObserved)} />
              <Metric
                label={`Preço típico (${days} dias)`}
                value={formatBRL(stats.typicalPrice)}
                hint="Média ponderada pelo tempo em que cada preço ficou valendo."
              />
              <Metric label="Preço anterior" value={formatBRL(stats.previousPrice)} />
              <Metric
                label="Variação desde o preço anterior"
                value={
                  stats.deltaAbs === null
                    ? "—"
                    : `${stats.deltaAbs < 0 ? "-" : "+"}${formatBRL(Math.abs(stats.deltaAbs))} (${Math.abs(stats.deltaPct ?? 0).toFixed(1)}%)`
                }
              />
              <Metric
                label="Acompanhando desde"
                value={formatDateBR(stats.firstObservedAt)}
                hint={`${stats.observations} observações registradas. Última: ${formatDateTimeBR(stats.lastObservedAt)}.`}
              />
            </dl>

            <section className="mt-8 rounded-2xl border border-border/60 bg-green-50/40 p-5 text-sm text-muted-foreground">
              <h2 className="mb-2 text-base font-semibold text-foreground">Como lemos esses números</h2>
              <p>
                Registramos o preço da bike a cada sincronização e guardamos apenas as mudanças reais. O preço típico é a
                média do período dando mais peso aos valores que ficaram mais tempo valendo. A classificação compara o
                preço de hoje com esse típico e com o menor valor já registrado — sempre com base no histórico registrado
                desde {formatDateBR(stats.firstObservedAt)}, nunca com outras lojas.
              </p>
              <p className="mt-2">
                Quando temos menos de 14 dias de acompanhamento ou apenas um preço, dizemos honestamente que o histórico
                ainda está em formação.
              </p>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default AcompanhamentoBike;
