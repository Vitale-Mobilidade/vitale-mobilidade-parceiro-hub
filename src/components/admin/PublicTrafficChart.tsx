import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PublicTraffic, TrafficHours } from "@/lib/admin-api";
import { saoPauloDay } from "../../../supabase/functions/_shared/growth-range";

const formatNumber = new Intl.NumberFormat("pt-BR");
const compactNumber = new Intl.NumberFormat("pt-BR", { notation: "compact" });
const formatChange = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const currentColor = "#047857";
const previousColor = "#64748b";

function dateLabel(date: string) {
  return date.split("-").reverse().join("/");
}

function periodLabel(start: string, end: string) {
  return start === end
    ? dateLabel(start)
    : `${dateLabel(start)} a ${dateLabel(end)}`;
}

function total(values: (number | null)[]) {
  if (!values.length || values.some((value) => value === null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function countLabel(count: number | null) {
  return count === null ? "—" : formatNumber.format(count);
}

function percentChange(current: number | null, previous: number | null) {
  return current !== null && previous !== null && previous > 0
    ? formatChange.format((current - previous) / previous)
    : "—";
}

function coveredPairs<
  T extends { views: number | null; previousViews: number | null },
>(points: T[]) {
  const paired = points.filter(
    (point) => point.views !== null && point.previousViews !== null,
  );
  return {
    paired,
    current: total(paired.map((point) => point.views)),
    previous: total(paired.map((point) => point.previousViews)),
  };
}

function hourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}h`;
}

function TrafficSeries({
  traffic,
  trafficHours,
  today,
}: {
  traffic: PublicTraffic;
  trafficHours: TrafficHours | null | undefined;
  today: string;
}) {
  const { days } = traffic;
  const first = days[0];
  const last = days[days.length - 1];
  if (
    !first ||
    !last ||
    !days.some((day) => day.views !== null || day.previousViews !== null)
  ) {
    return (
      <p role="status" className="mt-4 text-sm text-muted-foreground">
        Sem histórico de visualizações para estes períodos.
        {traffic.coverageSince &&
          ` Primeiro registro disponível em ${dateLabel(traffic.coverageSince)}.`}
      </p>
    );
  }

  const currentTotal = total(days.map((day) => day.views));
  const previousTotal = total(days.map((day) => day.previousViews));
  const closedDays = days.filter((day) => day.date < today);
  const dailyComparison = coveredPairs(closedDays);
  const includesToday = last.date === today;
  const singleDay = days.length === 1;
  const hourly = singleDay ? (trafficHours?.hours ?? []) : [];
  const hasHourly = hourly.some(
    (point) => point.views !== null || point.previousViews !== null,
  );
  const currentHour = Number(trafficHours?.currentHour.slice(11, 13));
  const closedHours = hourly.filter(
    (point) => !includesToday || point.hour < currentHour,
  );
  const comparison =
    singleDay && includesToday ? coveredPairs(closedHours) : dailyComparison;
  const change = percentChange(comparison.current, comparison.previous);
  const isPartial = comparison.paired.length < closedDays.length;
  const points = hasHourly
    ? hourly.map((point) => ({
        ...point,
        label: hourLabel(point.hour),
        title: `${hourLabel(point.hour)}${includesToday && point.hour === currentHour ? " (parcial)" : ""} · ${dateLabel(first.date)} × ${dateLabel(first.previousDate)}`,
        delta:
          includesToday && !closedHours.includes(point)
            ? "—"
            : percentChange(point.views, point.previousViews),
      }))
    : days.map((point) => ({
        ...point,
        label: dateLabel(point.date).slice(0, 5),
        title: `${dateLabel(point.date)}${point.date === today ? " (parcial)" : ""} × ${dateLabel(point.previousDate)}`,
        delta:
          point.date === today
            ? "—"
            : percentChange(point.views, point.previousViews),
      }));
  let comparisonDetail = "Em relação ao período anterior";
  if (singleDay && includesToday) {
    comparisonDetail = `${comparison.paired.length} de ${closedHours.length} horas fechadas comparadas`;
  } else if (isPartial) {
    comparisonDetail = `${comparison.paired.length} de ${closedDays.length} dias fechados com dados nos dois períodos`;
  } else if (includesToday) {
    comparisonDetail = "Exclui hoje e o dia equivalente";
  }
  if (!comparison.paired.length)
    comparisonDetail = "Cobertura insuficiente para comparar";
  if (comparison.previous === 0)
    comparisonDetail = "Sem visualizações na base anterior";

  return (
    <>
      <dl className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3">
        <div>
          <dt className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden="true"
              className="w-5 border-t-2 border-emerald-700"
            />
            Período selecionado
          </dt>
          <dd className="text-xl font-bold text-emerald-800 tabular-nums">
            {countLabel(currentTotal)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {periodLabel(first.date, last.date)}
            {includesToday && " · hoje parcial"}
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-2 text-sm font-medium">
            <span
              aria-hidden="true"
              className="w-5 border-t-2 border-dashed border-slate-500"
            />
            Período anterior
          </dt>
          <dd className="text-xl font-bold text-slate-700 tabular-nums">
            {countLabel(previousTotal)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {periodLabel(first.previousDate, last.previousDate)}
          </dd>
        </div>
        <div>
          <dt className="text-sm font-medium">
            {singleDay && includesToday
              ? "Variação em horas fechadas"
              : "Variação em dias fechados"}
          </dt>
          <dd className="text-xl font-bold tabular-nums">{change}</dd>
          <dd className="text-xs text-muted-foreground">{comparisonDetail}</dd>
        </div>
      </dl>
      {(currentTotal === null || previousTotal === null) && (
        <p className="mt-2 text-xs text-muted-foreground">
          O total de cada período exige cobertura em todos os dias.
        </p>
      )}
      {singleDay && !hasHourly && (
        <p role="status" className="mt-3 text-sm text-muted-foreground">
          {trafficHours
            ? "Sem histórico por hora para estas datas. Abaixo estão os totais diários disponíveis."
            : "Série horária indisponível. Abaixo estão os totais diários disponíveis."}
        </p>
      )}
      <div className="mt-4 h-56 min-w-0 sm:h-64">
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart
            data={points}
            margin={{ top: 8, right: 18, left: 0, bottom: 0 }}
            aria-labelledby="public-traffic-title"
            accessibilityLayer
          >
            <CartesianGrid
              vertical={false}
              stroke="#e2e8f0"
              strokeDasharray="4 4"
            />
            <XAxis
              dataKey="label"
              minTickGap={22}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              padding={points.length > 1 ? { left: 8, right: 8 } : undefined}
            />
            <YAxis
              width={43}
              allowDecimals={false}
              domain={[0, (max: number) => Math.max(1, max)]}
              tickFormatter={(value: number) => compactNumber.format(value)}
              tick={{ fontSize: 11, fill: "#475569" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              labelFormatter={(_, entries) => {
                const point = entries[0]?.payload as
                  (typeof points)[number] | undefined;
                if (!point) return "";
                return point.delta === "—"
                  ? point.title
                  : `${point.title} · ${point.delta}`;
              }}
              formatter={(value: number) => formatNumber.format(value)}
              contentStyle={{ borderRadius: "0.5rem", fontSize: "0.8rem" }}
            />
            {points.length === 1 && (
              <Bar
                dataKey="views"
                name="Selecionado"
                fill={currentColor}
                maxBarSize={56}
                isAnimationActive={false}
              />
            )}
            {points.length === 1 && (
              <Bar
                dataKey="previousViews"
                name="Anterior"
                fill={previousColor}
                maxBarSize={56}
                isAnimationActive={false}
              />
            )}
            {points.length > 1 && (
              <Line
                dataKey="views"
                name="Selecionado"
                stroke={currentColor}
                strokeWidth={2.5}
                dot={points.length <= 60 ? { r: 2 } : false}
                isAnimationActive={false}
              />
            )}
            {points.length > 1 && (
              <Line
                dataKey="previousViews"
                name="Anterior"
                stroke={previousColor}
                strokeWidth={2}
                strokeDasharray="5 4"
                dot={points.length <= 60 ? { r: 2 } : false}
                isAnimationActive={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2 text-sm">
        <summary className="min-h-10 cursor-pointer py-2 font-semibold text-emerald-800">
          {hasHourly ? "Ver valores por hora" : "Ver valores por dia"}
        </summary>
        <p className="mb-2 text-xs text-muted-foreground">
          — indica ausência de cobertura ou de base para a variação. Fuso de São
          Paulo.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs tabular-nums sm:text-sm">
            <thead className="border-b border-line">
              <tr>
                <th scope="col" className="p-2">
                  {hasHourly ? "Hora" : "Data"}
                </th>
                <th scope="col" className="p-2 text-right">
                  Selecionado
                </th>
                {!hasHourly && (
                  <th scope="col" className="p-2">
                    Data anterior
                  </th>
                )}
                <th scope="col" className="p-2 text-right">
                  Anterior
                </th>
                <th scope="col" className="p-2 text-right">
                  Variação
                </th>
              </tr>
            </thead>
            <tbody>
              {points.map((point, index) => (
                <tr
                  key={point.label + index}
                  className="border-b border-line last:border-0"
                >
                  <th scope="row" className="p-2 font-medium">
                    {hasHourly ? point.label : dateLabel(days[index].date)}
                    {!hasHourly && days[index].date === today && " (parcial)"}
                  </th>
                  <td className="p-2 text-right">{countLabel(point.views)}</td>
                  {!hasHourly && (
                    <td className="p-2">
                      {dateLabel(days[index].previousDate)}
                    </td>
                  )}
                  <td className="p-2 text-right">
                    {countLabel(point.previousViews)}
                  </td>
                  <td className="p-2 text-right">{point.delta}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </>
  );
}

export function PublicTrafficChart({
  traffic,
  generatedAt,
  trafficHours,
}: {
  traffic: PublicTraffic | null | undefined;
  trafficHours?: TrafficHours | null;
  generatedAt: string;
}) {
  return (
    <section
      aria-labelledby="public-traffic-title"
      className="min-w-0 rounded-xl border border-line bg-white p-3 shadow-sm sm:p-4"
    >
      <h2 id="public-traffic-title" className="text-base font-bold">
        {traffic?.days.length === 1 &&
        trafficHours?.hours.some(
          (point) => point.views !== null || point.previousViews !== null,
        )
          ? "Visualizações públicas por hora"
          : "Visualizações públicas por dia"}
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Aberturas de páginas públicas monitoradas, incluindo repetições e
        excluindo o admin.
      </p>
      {traffic ? (
        <TrafficSeries
          traffic={traffic}
          trafficHours={trafficHours}
          today={saoPauloDay(new Date(generatedAt))}
        />
      ) : (
        <p role="status" className="mt-4 text-sm text-muted-foreground">
          Série diária temporariamente indisponível.
        </p>
      )}
    </section>
  );
}
