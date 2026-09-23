import type { ProjectionPoint } from "@/lib/mobility/projection-engine";

const WIDTH = 640;
const HEIGHT = 240;
const PAD_X = 48;
const PAD_Y = 28;

export type ChartProjectionPoint = Pick<ProjectionPoint, "months" | "currentRouteCost" | "bikeCostWithPurchase">;

/** Acrescenta o investimento inicial real sem alterar os pontos calculados pelo motor. */
export function buildProjectionChartPoints(points: ProjectionPoint[], bikePrice: number): ChartProjectionPoint[] {
  return [{ months: 0, currentRouteCost: 0, bikeCostWithPurchase: bikePrice }, ...points];
}

function money(value: number) {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

/** SVG leve e reutilizável para comparar os dois custos acumulados, sem biblioteca de gráfico. */
export function CostProjectionChart({ points, bikeName, bikePrice }: { points: ProjectionPoint[]; bikeName: string; bikePrice: number }) {
  const chartPoints = buildProjectionChartPoints(points, bikePrice);
  const maxValue = Math.max(1, ...chartPoints.flatMap((point) => [point.currentRouteCost, point.bikeCostWithPurchase]));
  const x = (index: number) => PAD_X + (index / Math.max(1, chartPoints.length - 1)) * (WIDTH - PAD_X * 2);
  const y = (value: number) => HEIGHT - PAD_Y - (value / maxValue) * (HEIGHT - PAD_Y * 2);
  const path = (key: "currentRouteCost" | "bikeCostWithPurchase") =>
    chartPoints.map((point, index) => `${index === 0 ? "M" : "L"} ${x(index)} ${y(point[key])}`).join(" ");

  return (
    <figure aria-labelledby="projection-title projection-caption" className="overflow-hidden rounded-lg bg-surface p-4 ring-1 ring-line">
      <figcaption id="projection-title" className="font-bold text-ink">Projeção de custo acumulado</figcaption>
      <p id="projection-caption" className="mt-1 text-xs text-muted-foreground">
        Trajeto atual comparado com {bikeName}, incluindo o preço atual da bike no início.
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-ink" /> Trajeto atual</span>
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-action" /> Bike + operação</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 h-auto w-full" role="img" aria-label={`Comparação de custos acumulados em 12, 24 e 36 meses para ${bikeName}`}>
        {[0, 0.5, 1].map((ratio) => {
          const lineY = y(maxValue * ratio);
          return (
            <g key={ratio}>
              <line x1={PAD_X} x2={WIDTH - PAD_X} y1={lineY} y2={lineY} className="stroke-line" strokeWidth="1" />
              <text x="2" y={lineY + 4} className="fill-muted-foreground text-[11px]">{money(maxValue * ratio)}</text>
            </g>
          );
        })}
        <path d={path("currentRouteCost")} fill="none" className="stroke-ink" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path("bikeCostWithPurchase")} fill="none" className="stroke-action" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {chartPoints.map((point, index) => (
          <g key={point.months}>
            <circle cx={x(index)} cy={y(point.currentRouteCost)} r="4" className="fill-ink" />
            <circle cx={x(index)} cy={y(point.bikeCostWithPurchase)} r="4" className="fill-action" />
            <text x={x(index)} y={HEIGHT - 5} textAnchor="middle" className="fill-muted-foreground text-[11px]">{point.months}m</text>
          </g>
        ))}
      </svg>
      <div className="mt-3 grid gap-2 sm:grid-cols-3">
        {points.map((point) => (
          <div key={point.months} className="rounded-md bg-card p-3 text-xs ring-1 ring-line">
            <p className="font-bold text-ink">{point.months} meses</p>
            <p className={point.netBalance >= 0 ? "mt-1 text-action" : "mt-1 text-muted-foreground"}>
              Saldo: {money(point.netBalance)}
            </p>
          </div>
        ))}
      </div>
    </figure>
  );
}