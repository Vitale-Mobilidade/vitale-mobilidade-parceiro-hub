import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { adminCall, type AdminGrowth } from "@/lib/admin-api";
import { quizFunnelStages, safeRate } from "@/lib/admin-growth";
import { buildPageRanking, pageLabel } from "@/lib/admin-page-analytics";
import {
  growthRange,
  saoPauloDay,
} from "../../../supabase/functions/_shared/growth-range";

const panel = "rounded-xl border border-line bg-white p-3 sm:p-4 shadow-sm";
const input = "rounded-lg border border-line bg-white px-3 py-2 text-sm";
const number = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number | null) =>
  v == null ? "—" : `${(v * 100).toFixed(1)}%`;
const dayLabel = (v: string) => v.split("-").reverse().join("/");
function Bar({
  value,
  max,
  color = "bg-emerald-600",
}: {
  value: number;
  max: number;
  color?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"
    >
      <div
        className={`h-full rounded-full ${color}`}
        style={{
          width: `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`,
        }}
      />
    </div>
  );
}
function Ranking({
  title,
  detail,
  children,
}: {
  title: string;
  detail: string;
  children: React.ReactNode;
}) {
  return (
    <section className={panel}>
      <h2 className="text-sm font-bold">{title}</h2>
      <details className="mt-1 text-xs text-muted-foreground">
        <summary className="cursor-pointer">Como analisar</summary>
        <p className="mt-1">{detail}</p>
      </details>
      {children}
    </section>
  );
}
export function Growth() {
  const [preset, setPreset] = useState("30");
  const today = saoPauloDay();
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [applied, setApplied] = useState({ startDate: today, endDate: today });
  const [rangeError, setRangeError] = useState("");
  const [allBikes, setAllBikes] = useState(false);
  const [allRecommendations, setAllRecommendations] = useState(false);
  const [allPages, setAllPages] = useState(false);
  const [allOrigins, setAllOrigins] = useState(false);
  const [expandedBikeId, setExpandedBikeId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const yesterday = new Date(Date.parse(`${today}T12:00:00Z`) - 86400000)
    .toISOString()
    .slice(0, 10);
  const request =
    preset === "custom"
      ? applied
      : preset === "yesterday"
        ? { startDate: yesterday, endDate: yesterday }
        : { rangeDays: Number(preset) };
  const key =
    preset === "custom"
      ? `${applied.startDate}:${applied.endDate}`
      : preset === "yesterday"
        ? `yesterday:${yesterday}`
        : Number(preset);
  const growth = useQuery({
    queryKey: ["admin", "growth", key],
    queryFn: () => adminCall<AdminGrowth>("growth", request),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const data = growth.data;
  const f = data?.funnel;
  const stages = f ? quizFunnelStages(f) : [];
  const biggestLoss = stages
    .filter((s) => s.lost != null)
    .sort((a, b) => (b.lost ?? 0) - (a.lost ?? 0))[0];
  const pages = useMemo(
    () =>
      buildPageRanking(
        data?.sitewide.pages ?? [],
        data?.sitewide.pageViews ?? 0,
        query,
      ),
    [data, query],
  );
  const origins = [...(data?.sitewide.pageClicks ?? [])].sort(
    (a, b) =>
      b.offerClicks - a.offerClicks ||
      b.detailClicks - a.detailClicks ||
      a.path.localeCompare(b.path),
  );
  const recommendations = [...(data?.quizBikes ?? [])].sort(
    (a, b) =>
      b.primaryRecommendations +
      b.secondaryRecommendations -
      (a.primaryRecommendations + a.secondaryRecommendations),
  );
  const maxRecommendations = Math.max(
    1,
    ...recommendations.map(
      (b) => b.primaryRecommendations + b.secondaryRecommendations,
    ),
  );
  const maxOffers = Math.max(1, ...origins.map((p) => p.offerClicks));
  const bikes = [...(data?.sitewide.bikes ?? [])].sort(
    (a, b) => b.offerClicks - a.offerClicks || b.detailClicks - a.detailClicks,
  );
  const applyCustom = (event: React.FormEvent) => {
    event.preventDefault();
    try {
      growthRange({ startDate: start, endDate: end });
      setApplied({ startDate: start, endDate: end });
      setRangeError("");
    } catch (error) {
      setRangeError(
        error instanceof Error ? error.message : "Período inválido",
      );
    }
  };
  return (
    <>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Growth</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            De onde vem o interesse e onde a jornada perde força.
          </p>
        </div>
        <label className="text-sm font-semibold">
          Período{" "}
          <select
            className={`${input} ml-2`}
            value={preset}
            onChange={(e) => {
              setPreset(e.target.value);
              setRangeError("");
            }}
          >
            <option value="1">Hoje</option>
            <option value="yesterday">Ontem</option>
            <option value="7">7 dias</option>
            <option value="30">30 dias</option>
            <option value="90">90 dias</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>
      </div>
      {preset === "custom" && (
        <form
          onSubmit={applyCustom}
          className="mb-4 flex flex-wrap items-end gap-3"
        >
          <label className="text-sm">
            De
            <input
              type="date"
              required
              min="2020-01-01"
              max={today}
              className={`${input} ml-2`}
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="text-sm">
            Até
            <input
              type="date"
              required
              min={start}
              max={today}
              className={`${input} ml-2`}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
          <button className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">
            Aplicar período
          </button>
        </form>
      )}
      {rangeError && (
        <p role="alert" className="mb-4 text-red-700">
          {rangeError}
        </p>
      )}
      {growth.error && (
        <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800">
          {growth.error instanceof Error
            ? growth.error.message
            : "Não foi possível carregar Growth."}
        </p>
      )}
      {growth.isPlaceholderData && (
        <p role="status" className="mb-3 rounded-lg bg-amber-50 p-3 text-sm">
          Atualizando período. Os números abaixo ainda são da consulta anterior.
        </p>
      )}
      {!data || !f ? (
        <p aria-busy={!growth.error}>
          {growth.error
            ? "Indicadores indisponíveis."
            : "Carregando indicadores…"}
        </p>
      ) : (
        <div className="space-y-3" aria-busy={growth.isFetching}>
          <p className="text-xs text-muted-foreground">
            {data.startDate && data.endDate
              ? `${dayLabel(data.startDate)} a ${dayLabel(data.endDate)}`
              : `Últimos ${data.rangeDays} dias`}{" "}
            · Fuso de São Paulo · Atualizado em{" "}
            {new Date(data.generatedAt).toLocaleString("pt-BR", {
              timeZone: "America/Sao_Paulo",
            })}
          </p>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            {[
              [
                "Visualizações de páginas",
                data.sitewide.available ? number(data.sitewide.pageViews) : "—",
                "Volume de páginas abertas, incluindo repetições",
              ],
              [
                "Cliques em ofertas",
                data.sitewide.available
                  ? number(data.sitewide.affiliateClicks)
                  : "—",
                "Saídas para ofertas afiliadas; não são vendas",
              ],
              [
                "Conversão global do Quiz",
                pct(safeRate(f.completed, f.pageVisitors)),
                `${number(f.completed)} resultados / ${number(f.pageVisitors)} entradas`,
              ],
              [
                "Leads identificados",
                number(f.uniqueLeads),
                "Contatos deduplicados internamente por telefone",
              ],
            ].map(([label, value, detail]) => (
              <div key={label} className={panel} title={detail}>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-2xl font-bold text-emerald-900">
                  {value}
                </p>
                <p className="sr-only">{detail}</p>
              </div>
            ))}
          </div>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <section className={panel}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold">Funil do Quiz por etapa</h2>
                <span className="text-xs text-muted-foreground">
                  Início → resultado{" "}
                  <strong className="text-emerald-800">
                    {pct(safeRate(f.completed, f.started))}
                  </strong>
                </span>
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                Avançaram = sessões desta etapa ÷ etapa anterior. Perda =
                sessões que ainda não avançaram.
              </p>
              <div
                aria-hidden="true"
                className="mb-2 grid grid-cols-[minmax(0,1fr)_2.5rem_3.5rem_2.5rem] items-center gap-2 text-[11px] font-semibold text-muted-foreground"
              >
                <span>Etapa</span>
                <span className="text-right">Sessões</span>
                <span className="text-right">Avançaram</span>
                <span className="text-right">Perda</span>
              </div>
              <ol className="space-y-2">
                {stages.map((stage, index) => (
                  <li
                    key={stage.key}
                    title={`${stage.label}: ${number(stage.count)} sessões; ${pct(safeRate(stage.count, f.pageVisitors))} das entradas${stage.previousCount != null ? `; ${pct(safeRate(stage.count, stage.previousCount))} avançaram; ${number(stage.lost ?? 0)} não avançaram` : ""}`}
                  >
                    <div className="grid grid-cols-[minmax(0,1fr)_2.5rem_3.5rem_2.5rem] items-center gap-2 text-xs tabular-nums">
                      <div className="min-w-0">
                        <span className="block truncate" title={stage.label}>
                          {stage.key === "page"
                            ? "Entradas"
                            : stage.key === "started"
                              ? "Iniciaram"
                              : stage.key === "lead-form"
                                ? "Formulário"
                                : stage.key === "completed"
                                  ? "Resultado"
                                  : stage.label
                                      .replace("Pergunta ", "")
                                      .replace(
                                        "Experiência com bike elétrica",
                                        "Experiência",
                                      )}
                        </span>
                        <div
                          aria-hidden="true"
                          className="mt-1 flex h-1.5 justify-center rounded bg-slate-50"
                        >
                          <div
                            className="h-full rounded-sm"
                            style={{
                              width: `${f.pageVisitors > 0 ? Math.min(100, (stage.count / f.pageVisitors) * 100) : 0}%`,
                              backgroundColor: `hsl(160 70% ${29 + index * 2}%)`,
                            }}
                          />
                        </div>
                      </div>
                      <strong className="text-right">
                        <span className="sr-only">Sessões: </span>
                        {number(stage.count)}
                      </strong>
                      <strong className="text-right text-emerald-800">
                        <span className="sr-only">
                          Avançaram da etapa anterior:{" "}
                        </span>
                        {stage.previousCount == null
                          ? "—"
                          : pct(safeRate(stage.count, stage.previousCount))}
                      </strong>
                      <span
                        className={`text-right ${stage.lost ? "font-semibold text-amber-800" : "text-muted-foreground"}`}
                      >
                        <span className="sr-only">Não avançaram: </span>
                        {stage.lost == null ? "—" : number(stage.lost)}
                      </span>
                    </div>
                    <span className="sr-only">
                      {stage.label} ·{" "}
                      {pct(safeRate(stage.count, f.pageVisitors))} das entradas
                      {stage.previousCount != null && (
                        <>
                          {" "}
                          · {pct(
                            safeRate(stage.count, stage.previousCount),
                          )}{" "}
                          avançaram · {number(stage.lost ?? 0)} não avançaram
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-2 text-xs">
                <div
                  title={`Maior perda antes de: ${biggestLoss?.label ?? "—"}. Inclui sessões ativas.`}
                >
                  <p className="text-muted-foreground">Maior perda</p>
                  <strong className="text-lg text-amber-800">
                    {number(biggestLoss?.lost ?? 0)}
                  </strong>
                  <p className="truncate">
                    {biggestLoss?.label ?? "Sem perda"}
                  </p>
                </div>
                <div
                  title={`Sessões incompletas sem atividade há mais de ${f.abandonAfterMinutes} minutos.`}
                >
                  <p className="text-muted-foreground">Abandono confirmado</p>
                  <strong className="text-lg text-rose-800">
                    {number(
                      f.introAbandoned +
                        f.leadFormAbandoned +
                        f.steps.reduce((sum, step) => sum + step.abandoned, 0),
                    )}
                  </strong>
                </div>
                <div title="Eventos nos CTAs do resultado; não são vendas.">
                  <p className="text-muted-foreground">Cliques no Quiz</p>
                  <strong className="text-lg">
                    {data.quizBikesAvailable
                      ? number(
                          data.quizBikes.reduce(
                            (sum, b) => sum + b.quizOfferClicks,
                            0,
                          ),
                        )
                      : "—"}
                  </strong>
                  {!data.quizBikesAvailable && <p>Fonte indisponível</p>}
                </div>
              </div>
              <details className="mt-1 text-xs text-muted-foreground">
                <summary className="cursor-pointer font-semibold">
                  Como ler o funil e a cobertura
                </summary>
                <p className="mt-2">
                  Sessões selecionadas pela primeira entrada no período;
                  progresso observado até esta consulta, inclusive após o fim do
                  período. Abandono confirmado exige {f.abandonAfterMinutes}{" "}
                  minutos sem atividade; “não avançaram” também inclui sessões
                  ativas. Funil medido desde{" "}
                  {f.coverageSince
                    ? new Date(f.coverageSince).toLocaleDateString("pt-BR", {
                        timeZone: "America/Sao_Paulo",
                      })
                    : "ainda sem registros"}
                  . Site desde{" "}
                  {data.sitewide.coverageSince ?? "ainda sem cobertura"}. Sem
                  reconstrução retroativa.
                </p>
                <ul className="mt-2 space-y-1">
                  {stages
                    .filter((stage) => stage.previousCount != null)
                    .map((stage) => (
                      <li key={stage.key}>
                        {stage.label}:{" "}
                        {pct(safeRate(stage.count, stage.previousCount ?? 0))}{" "}
                        avançaram · {number(stage.lost ?? 0)} não avançaram
                      </li>
                    ))}
                </ul>
              </details>
            </section>
            <section className={panel}>
              <h2 className="text-sm font-bold">
                Quais páginas geram cliques em ofertas?
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Origem → cliques em ofertas
              </p>
              {!data.sitewide.available ? (
                <p role="status" className="mt-4">
                  {data.sitewide.status === "unavailable"
                    ? "Métricas do site temporariamente indisponíveis."
                    : "A coleta do site ainda não tem cobertura."}
                </p>
              ) : data.sitewide.pageClicks == null ? (
                <p role="status" className="mt-4">
                  Origem por página indisponível nesta versão da consulta.
                </p>
              ) : origins.length ? (
                <ol className="mt-3 space-y-2">
                  {origins
                    .slice(0, allOrigins ? undefined : 5)
                    .map((origin) => (
                      <li
                        key={origin.path}
                        className="border-b border-line pb-2 last:border-0"
                      >
                        <div className="flex flex-wrap justify-between gap-3">
                          <div>
                            <p className="font-semibold">
                              {pageLabel(origin.path)}
                            </p>
                            <p className="break-all text-xs text-muted-foreground">
                              {origin.path}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-emerald-800">
                            {number(origin.offerClicks)}{" "}
                            <span className="text-xs font-normal">
                              cliques em ofertas
                            </span>
                          </p>
                        </div>
                        <Bar value={origin.offerClicks} max={maxOffers} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {number(origin.views)} visualizações ·{" "}
                          {number(origin.detailClicks)} aberturas de detalhe ·{" "}
                          {origin.views > 0
                            ? `${((origin.offerClicks / origin.views) * 100).toFixed(1)} cliques em oferta a cada 100 visualizações`
                            : "Sem visualizações registradas para calcular a proporção"}
                        </p>
                      </li>
                    ))}
                </ol>
              ) : (
                <p className="mt-4 text-sm">
                  Nenhum clique em oferta ou detalhe registrado no período.
                </p>
              )}
              {origins.length > 5 && (
                <button
                  type="button"
                  onClick={() => setAllOrigins(!allOrigins)}
                  className="mt-4 min-h-10 text-sm font-semibold text-emerald-800 underline"
                >
                  {allOrigins
                    ? "Mostrar principais páginas"
                    : `Ver todas as ${origins.length} páginas`}
                </button>
              )}
              <details className="mt-2 text-xs text-muted-foreground">
                <summary className="cursor-pointer">
                  Como analisar os cliques
                </summary>
                <p className="mt-1">
                  Contagens de eventos, não pessoas: cliques repetidos podem
                  superar as visualizações. Cobre links de ofertas e de detalhes
                  de bikes instrumentados; outros links não estão medidos.
                </p>
              </details>
            </section>
          </div>
          <div className="grid items-start gap-3 lg:grid-cols-2">
            <Ranking
              title="Rotas públicas com mais visualizações"
              detail="As barras comparam o volume de tráfego entre páginas."
            >
              <label className="mt-2 block text-xs">
                Buscar entre as rotas exibidas
                <input
                  type="search"
                  placeholder="Radar, Quiz ou conteúdo"
                  className={`${input} mt-1 w-full`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <p className="mt-1 text-xs text-muted-foreground">
                A busca filtra somente o top 20 carregado.
              </p>
              {!data.sitewide.available ? (
                <p className="mt-4">Fonte de tráfego indisponível.</p>
              ) : (
                <>
                  <ol className="mt-3 space-y-2">
                    {pages.slice(0, allPages ? undefined : 5).map((page) => (
                      <li key={page.path}>
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="font-semibold">{page.label}</span>
                          <strong>{number(page.views)}</strong>
                        </div>
                        <p className="break-all text-xs text-muted-foreground">
                          {page.path}
                        </p>
                        <Bar value={page.views} max={pages[0]?.views ?? 0} />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {pct(safeRate(page.views, data.sitewide.pageViews))}{" "}
                          das visualizações do site
                        </p>
                      </li>
                    ))}
                  </ol>
                  {!pages.length && (
                    <p role="status" className="mt-4">
                      Nenhuma rota exibida corresponde à busca ou ao período.
                    </p>
                  )}
                  {pages.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setAllPages(!allPages)}
                      className="mt-4 min-h-10 text-sm font-semibold text-emerald-800 underline"
                    >
                      {allPages
                        ? "Mostrar principais páginas"
                        : "Ver todas as rotas carregadas"}
                    </button>
                  )}
                  <details className="mt-2 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">
                      O que significa a %?
                    </summary>
                    <p className="mt-1">
                      A antiga “participação” é a fatia do tráfego:
                      visualizações da página ÷ visualizações do site. Não é
                      conversão. Exibidas até 20 rotas; as fatias podem somar
                      menos de 100%.
                    </p>
                  </details>
                </>
              )}
            </Ranking>
            <Ranking
              title="Bikes recomendadas pelo Quiz"
              detail="Recomendações principais e alternativas; compare exposição e cliques, sem confundir com vendas."
            >
              {!data.quizBikesAvailable ? (
                <p role="status" className="mt-4">
                  A fonte agregada de recomendações está indisponível.
                </p>
              ) : (
                <>
                  <p className="mt-2 text-xs">
                    <span className="text-emerald-800">■ Principal</span> ·{" "}
                    <span className="text-sky-700">■ Alternativa</span>
                  </p>
                  <ol className="mt-3 space-y-2">
                    {recommendations
                      .slice(0, allRecommendations ? undefined : 5)
                      .map((bike) => (
                        <li key={bike.bikeId}>
                          <div className="flex justify-between gap-3 text-sm">
                            <strong>{bike.name}</strong>
                            <span>
                              {number(
                                bike.primaryRecommendations +
                                  bike.secondaryRecommendations,
                              )}{" "}
                              recomendações
                            </span>
                          </div>
                          <div
                            aria-hidden="true"
                            className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-slate-100"
                          >
                            <div
                              className="bg-emerald-600"
                              style={{
                                width: `${(bike.primaryRecommendations / maxRecommendations) * 100}%`,
                              }}
                            />
                            <div
                              className="bg-sky-500"
                              style={{
                                width: `${(bike.secondaryRecommendations / maxRecommendations) * 100}%`,
                              }}
                            />
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {number(bike.primaryRecommendations)} principal ·{" "}
                            {number(bike.secondaryRecommendations)} alternativa
                            ·{" "}
                            <strong>
                              {number(bike.quizOfferClicks)} cliques em ofertas
                            </strong>
                          </p>
                        </li>
                      ))}
                  </ol>
                  {!recommendations.length && (
                    <p className="mt-4">Ainda sem recomendações no período.</p>
                  )}
                  {recommendations.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setAllRecommendations(!allRecommendations)}
                      className="mt-4 min-h-10 text-sm font-semibold text-emerald-800 underline"
                    >
                      {allRecommendations
                        ? "Mostrar principais bikes"
                        : "Ver todas as recomendações"}
                    </button>
                  )}
                </>
              )}
            </Ranking>
          </div>
          <Ranking
            title="Interesse nas bikes em todo o site"
            detail="Bikes ordenadas por cliques em ofertas. Selecione uma para consultar as páginas de origem."
          >
            {data.sitewide.available ? (
              <>
                <ol className="mt-3 grid gap-2 md:grid-cols-3">
                  {bikes.slice(0, allBikes ? undefined : 6).map((bike) => (
                    <li
                      key={bike.bikeId}
                      className="rounded-lg border border-line p-2"
                    >
                      <button
                        type="button"
                        aria-expanded={expandedBikeId === bike.bikeId}
                        onClick={() =>
                          setExpandedBikeId(
                            expandedBikeId === bike.bikeId ? null : bike.bikeId,
                          )
                        }
                        className="min-h-11 w-full text-left"
                      >
                        <div className="flex justify-between gap-3 text-sm">
                          <strong>{bike.name}</strong>
                          <span>{number(bike.offerClicks)} ofertas</span>
                        </div>
                        <Bar
                          value={bike.offerClicks}
                          max={Math.max(1, ...bikes.map((b) => b.offerClicks))}
                        />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {number(bike.detailClicks)} aberturas de detalhe ·{" "}
                          {number(bike.offerClicks)} cliques em ofertas · Ver
                          origens
                        </p>
                      </button>
                      {expandedBikeId === bike.bikeId && (
                        <div className="mt-3 border-t border-line pt-3">
                          <h3 className="text-sm font-semibold">
                            Origem dos cliques
                          </h3>
                          {bike.origins.length ? (
                            <ul className="mt-2 space-y-2">
                              {bike.origins.map((o) => (
                                <li key={o.path} className="text-xs">
                                  <p className="break-all">{o.path}</p>
                                  <p className="text-muted-foreground">
                                    {number(o.detailClicks)} detalhe ·{" "}
                                    {number(o.offerClicks)} oferta
                                  </p>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-xs">Sem origem registrada.</p>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
                {!bikes.length && (
                  <p className="mt-4">Ainda sem cliques em bikes no período.</p>
                )}
                {bikes.length > 6 && (
                  <button
                    type="button"
                    className="mt-4 min-h-10 text-sm font-semibold text-emerald-800 underline"
                    onClick={() => setAllBikes(!allBikes)}
                  >
                    {allBikes
                      ? "Mostrar principais bikes"
                      : "Ver todas as bikes"}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-4">Fonte de cliques indisponível.</p>
            )}
          </Ranking>
          <p className="text-xs text-muted-foreground">
            Recomendações e cliques usam a data do evento; tráfego usa dias de
            calendário. Bloqueadores, robôs e falhas de rede podem alterar as
            contagens.
          </p>
        </div>
      )}
    </>
  );
}
