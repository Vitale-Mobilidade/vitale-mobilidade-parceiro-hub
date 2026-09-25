import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/lib/price-tracker";
import { type DailyPoint } from "@/lib/price-daily";
import { lastRealIndex, unavailableMessage } from "@/lib/radar-unavailable";
import { chartEvidence } from "@/lib/radar-chart";

interface Props {
  series: DailyPoint[];
  /** Altura reduzida para o painel compacto do Radar (padrão: altura original). */
  compact?: boolean;
  /** Marca em vermelho o ponto mais recente: oferta indisponível no Mercado Livre. */
  markLastUnavailable?: boolean;
}

interface Row {
  date: string;
  label: string;
  /** Linha-base contínua: valor em todo dia com preço; null apenas em lacuna real. */
  value: number | null;
  unavailable: boolean;
  point: DailyPoint | null;
}

function toRows(series: DailyPoint[], markLastUnavailable: boolean): Row[] {
  const unavailableIdx = markLastUnavailable ? lastRealIndex(series) : -1;
  return series.map((p, i) => {
    const missing = p.verification === "missing";
    const value = !missing && Number.isFinite(p.close) && p.close > 0 ? p.close : null;
    return {
      date: p.date,
      label: formatDateBR(p.date),
      value,
      unavailable: i === unavailableIdx,
      point: missing ? null : p,
    };
  });
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row.point) {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-md">
        <p className="font-semibold">{row.label}</p>
        <p className="mt-1 text-muted-foreground">Sem verificação neste dia.</p>
      </div>
    );
  }
  const p = row.point;
  return (
    <div className="rounded-lg border border-border bg-card p-3 text-xs shadow-md">
      <p className="font-semibold">{row.label}</p>
      <p className="mt-1">Fechamento: <strong>{formatBRL(p.close)}</strong></p>
      {p.low !== p.high && (
        <p>
          Mínima {formatBRL(p.low)} · Máxima {formatBRL(p.high)}
        </p>
      )}
      {p.lastVerifiedAt && <p className="text-muted-foreground">Última verificação: {formatDateTimeBR(p.lastVerifiedAt)}</p>}
      {row.unavailable && (
        <p className="mt-1 max-w-[16rem] font-medium text-destructive">{unavailableMessage(row.date)}</p>
      )}
    </div>
  );
}

export function DailyPriceChart({ series, compact = false, markLastUnavailable = false }: Props) {
  const { domain } = chartEvidence(series);
  const rows = toRows(series, markLastUnavailable);
  if (rows.length === 0 || !domain) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
        Ainda não registramos dias verificados nesse período.
      </p>
    );
  }
  return (
    <div
      className={
        compact
          ? "h-[180px] w-full rounded-xl border border-line bg-card p-2 md:h-[200px]"
          : "h-72 w-full rounded-2xl border border-border/60 bg-card p-3 md:h-80"
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis tick={{ fontSize: 11 }} width={78} domain={domain} allowDataOverflow tickFormatter={(v: number) => formatBRL(v)} />
          <Tooltip content={<ChartTooltip />} />
          <Line type="stepAfter" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
