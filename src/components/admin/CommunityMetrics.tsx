import { useEffect, useState, type FormEvent } from "react";
import { adminClassifiedsCall } from "@/lib/admin-classifieds-api";
import {
  periodMetricsSchema,
  type PeriodMetrics,
} from "@/lib/admin-classifieds";
import { formatBRL } from "@/lib/price-tracker";
const button =
  "inline-flex min-h-11 items-center justify-center rounded-xl bg-action px-4 py-2 font-semibold text-white disabled:opacity-50";
const field = "min-h-11 rounded-xl border border-line bg-white px-3 py-2";
const date = (s: string) => s.split("-").reverse().join("/");
const periods = [
  ["today", "Hoje"],
  ["yesterday", "Ontem"],
  ["week", "Esta semana"],
  ["month", "Este mês"],
  ["last7", "Últimos 7 dias"],
  ["last30", "Últimos 30 dias"],
  ["last90", "Últimos 90 dias"],
  ["custom", "Personalizado"],
];
function Comparison({
  current,
  previous,
  money,
}: {
  current: number;
  previous: number | null;
  money: boolean;
}) {
  const fmt = (n: number) =>
    money ? formatBRL(n / 100) : n.toLocaleString("pt-BR");
  if (previous === null)
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Sem base comparável antes do marco de apuração.
      </p>
    );
  const diff = current - previous;
  const change =
    previous === 0
      ? current === 0
        ? "Sem variação"
        : "Novo resultado; base anterior zero"
      : `${diff > 0 ? "+" : ""}${((100 * diff) / previous).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return (
    <div className="mt-3 text-xs">
      <p
        className={`font-semibold ${diff < 0 ? "text-red-800" : diff > 0 ? "text-action" : "text-muted-foreground"}`}
      >
        {change}
      </p>
      <p className="mt-1 text-muted-foreground">
        Anterior: {fmt(previous)} · Diferença: {diff > 0 ? "+" : ""}
        {fmt(diff)}
      </p>
    </div>
  );
}
export function CommunityMetrics({ refreshKey = 0 }: { refreshKey?: number }) {
  const [period, setPeriod] = useState("last30"),
    [start, setStart] = useState(""),
    [end, setEnd] = useState(""),
    [range, setRange] = useState({ period: "last30" }),
    [retry, setRetry] = useState(0);
  const [metrics, setMetrics] = useState<PeriodMetrics | null>(null),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  useEffect(() => {
    let current = true;
    setLoading(true);
    setMetrics(null);
    setError("");
    void adminClassifiedsCall("period_metrics", range)
      .then((v) => {
        if (current) setMetrics(periodMetricsSchema.parse(v));
      })
      .catch(() => {
        if (current)
          setError(
            "Não foi possível carregar este período. Confira as datas e tente novamente.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [range, retry, refreshKey]);
  function apply(e: FormEvent) {
    e.preventDefault();
    if (period === "custom") {
      const a = Date.parse(`${start}T00:00:00Z`),
        b = Date.parse(`${end}T00:00:00Z`);
      if (
        !Number.isFinite(a) ||
        !Number.isFinite(b) ||
        a > b ||
        b - a > 365 * 86400000
      ) {
        setError("Escolha início e fim em ordem, com no máximo 366 dias.");
        return;
      }
      setRange({ period, ...{ start, end } });
    } else setRange({ period });
    setRetry((n) => n + 1);
  }
  const max = Math.max(1, ...(metrics?.daily.map((d) => d.grossCents) ?? []));
  const kpis = [
    ["Perfis cadastrados", "members"],
    ["Anúncios criados", "listings"],
    ["Anúncios publicados", "publications"],
    ["Faturamento confirmado", "grossCents"],
  ] as const;
  return (
    <div className="space-y-5" aria-busy={loading}>
      <form
        onSubmit={apply}
        className="flex flex-wrap items-end justify-between gap-3"
      >
        <label className="grid gap-2 text-sm font-semibold">
          Período
          <select
            aria-label="Período do painel"
            value={period}
            className={field}
            onChange={(e) => {
              setPeriod(e.target.value);
              if (e.target.value !== "custom")
                setRange({ period: e.target.value });
            }}
          >
            {periods.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        {period === "custom" && (
          <>
            <label className="grid gap-2 text-sm font-semibold">
              Data inicial
              <input
                type="date"
                aria-label="Data inicial"
                required
                min="2000-01-01"
                max={today}
                className={field}
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Data final
              <input
                type="date"
                aria-label="Data final"
                required
                min={start || "2000-01-01"}
                max={today}
                className={field}
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </label>
            <p className="text-xs text-muted-foreground">
              Até 366 dias, sem datas futuras.
            </p>
          </>
        )}
        <button className={button} disabled={loading}>
          {period === "custom" ? "Aplicar período" : "Atualizar painel"}
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-900">
          {error}
          <button
            className="ml-3 min-h-11 underline"
            onClick={() => setRetry((n) => n + 1)}
          >
            Tentar novamente
          </button>
        </p>
      )}
      {loading && <p role="status">Carregando acompanhamento…</p>}
      {metrics && (
        <>
          <div
            className="rounded-xl border border-line bg-white p-4 text-sm"
            role="status"
          >
            <p>
              <strong>
                {date(metrics.start)} a {date(metrics.end)}
              </strong>{" "}
              · Horário de São Paulo
            </p>
            <p className="mt-1">
              Comparação: {date(metrics.previousStart)} a{" "}
              {date(metrics.previousEnd)}.
              {!metrics.comparable &&
                " Período anterior sem cobertura completa; comparação indisponível."}
            </p>
            {metrics.trackingSince && (
              <p className="mt-2 text-xs text-muted-foreground">
                Indicadores desde {date(metrics.trackingSince)}.
                {metrics.effectiveStart > metrics.start
                  ? ` Neste intervalo, apuração a partir de ${date(metrics.effectiveStart)}.`
                  : ""}
                {Boolean(metrics.excludedOrders) &&
                  " Compras de teste não entram na apuração."}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {kpis.map(([label, key]) => (
              <section
                key={key}
                className="min-w-0 rounded-2xl border border-line bg-white p-5"
              >
                <h2 className="text-sm font-semibold text-muted-foreground">
                  {label}
                </h2>
                <p className="mt-2 break-words text-3xl font-bold text-ink">
                  {key === "grossCents"
                    ? formatBRL(metrics.current[key] / 100)
                    : metrics.current[key].toLocaleString("pt-BR")}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {key === "grossCents"
                    ? "Bruto confirmado no período"
                    : key === "publications"
                      ? "Primeira publicação de cada bike"
                      : key === "listings"
                        ? `${metrics.current.channelListings} do canal · inclui rascunhos com conteúdo e desativados`
                        : "Novos membros no período"}
                </p>
                <Comparison
                  current={metrics.current[key]}
                  previous={
                    metrics.comparable && metrics.previous
                      ? metrics.previous[key]
                      : null
                  }
                  money={key === "grossCents"}
                />
              </section>
            ))}
          </div>
          <p className="text-sm">
            <strong>{metrics.activeNow} anúncios ativos agora</strong> · Estoque
            atual, separado das publicações no período.
          </p>
          <section className="rounded-2xl border border-line bg-white p-5">
            <h2 className="text-xl font-bold">Faturamento por dia</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Primeira confirmação de cada compra, no horário de São Paulo.
              Valores brutos, antes de taxas e estornos. Não inclui pagamentos
              pendentes nem bikes do canal.
            </p>
            <div
              role="img"
              aria-label={`Faturamento bruto de ${date(metrics.start)} a ${date(metrics.end)}: ${formatBRL(metrics.current.grossCents / 100)}`}
              className="mt-5 flex h-28 items-end gap-1 border-b border-line"
            >
              {[...metrics.daily].reverse().map((d) => (
                <div
                  key={d.day}
                  title={`${date(d.day)}: ${formatBRL(d.grossCents / 100)}`}
                  style={{
                    height: `${Math.max(2, (100 * d.grossCents) / max)}%`,
                  }}
                  className={`min-w-0 flex-1 rounded-t ${d.grossCents ? "bg-action" : "bg-surface"}`}
                />
              ))}
            </div>
            {!metrics.daily.length && (
              <p className="mt-4 text-sm">
                Nenhum dia disponível para apuração neste intervalo.
              </p>
            )}
            <p className="mt-4 text-sm">
              Pagamentos com estorno ou contestação registrados:{" "}
              <strong>{metrics.current.reversedPayments}</strong>. Este
              acompanhamento não representa o saldo líquido do Asaas.
            </p>
            <div
              className="mt-5 overflow-x-auto"
              tabIndex={0}
              role="region"
              aria-label="Resultados diários"
            >
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  Cadastro, anúncios e pagamentos por dia
                </caption>
                <thead>
                  <tr>
                    {[
                      "Dia",
                      "Novos perfis",
                      "Anúncios criados",
                      "Anúncios publicados",
                      "Pagamentos confirmados",
                      "Faturamento bruto",
                    ].map((h) => (
                      <th
                        key={h}
                        scope="col"
                        className="whitespace-nowrap border-b border-line px-3 py-3"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {metrics.daily.map((d) => (
                    <tr key={d.day}>
                      <td className="whitespace-nowrap px-3 py-3">
                        {date(d.day)}
                      </td>
                      {[d.members, d.listings, d.publications, d.payments].map(
                        (n, i) => (
                          <td key={i} className="px-3 py-3">
                            {n}
                          </td>
                        ),
                      )}
                      <td className="whitespace-nowrap px-3 py-3 font-semibold">
                        {formatBRL(d.grossCents / 100)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Semana começa na segunda-feira. Semana e mês comparam os mesmos
              dias decorridos do período anterior; os demais intervalos comparam
              o bloco imediatamente anterior. Newsletter sem perfil não entra no
              total de membros. Cada compra é contada uma vez.
            </p>
          </section>
        </>
      )}
    </div>
  );
}
