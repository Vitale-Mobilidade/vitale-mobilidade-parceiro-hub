import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/lib/price-tracker";
import { VERIFICATION_LABEL, type DailyPoint } from "@/lib/price-daily";

interface Props {
  series: DailyPoint[];
}

interface Row {
  date: string;
  label: string;
  verified: number | null;
  reconstructed: number | null;
  point: DailyPoint | null;
}

function toRows(series: DailyPoint[]): Row[] {
  return series.map((p) => {
    const value = Number.isFinite(p.close) ? p.close : null;
    const isVerified = p.verification === "observed_change" || p.verification === "confirmed_unchanged";
    return {
      date: p.date,
      label: formatDateBR(p.date),
      verified: isVerified ? value : null,
      reconstructed: p.verification === "reconstructed" ? value : null,
      point: p.verification === "missing" ? null : p,
    };
  });
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  if (!row.point) {
    return (
      <div className="rounded-lg border border-border bg-white p-3 text-xs shadow-md">
        <p className="font-semibold">{row.label}</p>
        <p className="mt-1 text-muted-foreground">Sem verificação neste dia.</p>
      </div>
    );
  }
  const p = row.point;
  return (
    <div className="rounded-lg border border-border bg-white p-3 text-xs shadow-md">
      <p className="font-semibold">{row.label}</p>
      <p className="mt-1">Fechamento: <strong>{formatBRL(p.close)}</strong></p>
      {p.low !== p.high && (
        <p>
          Mínima {formatBRL(p.low)} · Máxima {formatBRL(p.high)}
        </p>
      )}
      {p.lastVerifiedAt && <p className="text-muted-foreground">Última verificação: {formatDateTimeBR(p.lastVerifiedAt)}</p>}
      <p className="text-muted-foreground">{VERIFICATION_LABEL[p.verification]}</p>
    </div>
  );
}

export function DailyPriceChart({ series }: Props) {
  const rows = toRows(series);
  if (rows.length === 0) {
    return (
      <p className="rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
        Ainda não registramos dias verificados nesse período.
      </p>
    );
  }
  return (
    <div className="h-72 w-full rounded-2xl border border-border/60 bg-white p-3 md:h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 10, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} minTickGap={28} />
          <YAxis tick={{ fontSize: 11 }} width={78} domain={["auto", "auto"]} tickFormatter={(v: number) => formatBRL(v)} />
          <Tooltip content={<ChartTooltip />} />
          <Line
            type="stepAfter"
            dataKey="reconstructed"
            stroke="hsl(var(--muted-foreground))"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
            connectNulls={false}
            isAnimationActive={false}
          />
          <Line
            type="stepAfter"
            dataKey="verified"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={{ r: 2.5 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
