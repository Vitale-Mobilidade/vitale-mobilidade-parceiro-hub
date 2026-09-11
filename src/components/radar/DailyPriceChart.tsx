import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatBRL, formatDateBR, formatDateTimeBR } from "@/lib/price-tracker";
import { VERIFICATION_LABEL, type DailyPoint } from "@/lib/price-daily";

interface Props {
  series: DailyPoint[];
}

interface Row {
  date: string;
  label: string;
  /** Linha-base contínua: valor em todo dia com preço; null apenas em lacuna real. */
  value: number | null;
  reconstructed: boolean;
  point: DailyPoint | null;
}

function toRows(series: DailyPoint[]): Row[] {
  return series.map((p) => {
    const missing = p.verification === "missing";
    const value = !missing && Number.isFinite(p.close) ? p.close : null;
    return {
      date: p.date,
      label: formatDateBR(p.date),
      value,
      reconstructed: p.verification === "reconstructed",
      point: missing ? null : p,
    };
  });
}

/** Dias confirmados ganham ponto cheio; reconstruídos, um marcador vazado e discreto. */
function DayDot(props: { cx?: number; cy?: number; payload?: Row }) {
  const { cx, cy, payload } = props;
  if (cx === undefined || cy === undefined || !payload || payload.value === null) return null;
  return payload.reconstructed ? (
    <circle cx={cx} cy={cy} r={2.5} fill="hsl(var(--background))" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} />
  ) : (
    <circle cx={cx} cy={cy} r={2.8} fill="hsl(var(--primary))" />
  );
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
            dataKey="value"
            stroke="hsl(var(--primary))"
            strokeWidth={2.5}
            dot={<DayDot />}
            activeDot={{ r: 4 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
