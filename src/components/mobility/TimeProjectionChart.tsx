import type { TimeProjectionPoint } from "@/lib/mobility/time-engine";
import { decimal } from "@/lib/mobility/format";

const WIDTH = 640;
const HEIGHT = 240;
const PAD_X = 48;
const PAD_Y = 28;

/** Série com o ponto de origem (0 anos = 0 h) seguido apenas dos pontos calculados pelo motor. */
export function buildTimeChartPoints(points: TimeProjectionPoint[]): TimeProjectionPoint[] {
  return [{ years: 0, currentHours: 0, bikeHours: 0, savedHours: 0 }, ...points];
}

/** SVG leve: horas acumuladas no trajeto atual vs de bike (1/3/5 anos). */
export function TimeProjectionChart({ points }: { points: TimeProjectionPoint[] }) {
  const series = buildTimeChartPoints(points);
  const maxYears = Math.max(1, ...series.map((p) => p.years));
  const maxValue = Math.max(1, ...series.flatMap((p) => [p.currentHours, p.bikeHours]));
  const x = (years: number) => PAD_X + (years / maxYears) * (WIDTH - PAD_X * 2);
  const y = (v: number) => HEIGHT - PAD_Y - (v / maxValue) * (HEIGHT - PAD_Y * 2);
  const path = (key: "currentHours" | "bikeHours") =>
    series.map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.years)} ${y(p[key])}`).join(" ");

  return (
    <figure aria-labelledby="time-projection-title" className="overflow-hidden rounded-lg bg-surface p-4 ring-1 ring-line">
      <figcaption id="time-projection-title" className="font-bold text-ink">Horas acumuladas no trajeto</figcaption>
      <p className="mt-1 text-xs text-muted-foreground">Projeção com os minutos que você informou, repetidos a cada ano. Estimativa.</p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-ink" /> Hoje</span>
        <span className="flex items-center gap-2"><span className="h-0.5 w-6 bg-action" /> De bike</span>
      </div>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="mt-2 h-auto w-full" role="img" aria-label="Horas acumuladas hoje e de bike em 1, 3 e 5 anos">
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line x1={PAD_X} x2={WIDTH - PAD_X} y1={y(maxValue * r)} y2={y(maxValue * r)} className="stroke-line" strokeWidth="1" />
            <text x="2" y={y(maxValue * r) + 4} className="fill-muted-foreground text-[11px]">{Math.round(maxValue * r)} h</text>
          </g>
        ))}
        <path d={path("currentHours")} fill="none" className="stroke-ink" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        <path d={path("bikeHours")} fill="none" className="stroke-action" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {series.map((p) => (
          <text key={p.years} x={x(p.years)} y={HEIGHT - 6} textAnchor="middle" className="fill-muted-foreground text-[11px]">{p.years === 0 ? "hoje" : `${p.years} ano${p.years > 1 ? "s" : ""}`}</text>
        ))}
      </svg>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {points.map((p) => (
          <div key={p.years} className="rounded-md bg-card p-2 ring-1 ring-line">
            <dt className="text-muted-foreground">{p.years} ano{p.years > 1 ? "s" : ""}</dt>
            <dd className="font-bold text-ink">{p.savedHours >= 0 ? "" : "+"}{decimal(Math.abs(p.savedHours))} h {p.savedHours >= 0 ? "a menos" : "a mais"}</dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}
