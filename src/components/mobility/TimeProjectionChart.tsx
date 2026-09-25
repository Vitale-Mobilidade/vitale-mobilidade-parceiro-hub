import { Link } from "@tanstack/react-router";
import { ArrowRight, Bike, Clock3, ExternalLink, LineChart, Youtube } from "lucide-react";
import { BikeMedia } from "@/components/site/site-ui";
import { VideoCards } from "@/components/site/VideoCards";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import { brl } from "@/lib/mobility/format";
import type { RecommendedBike } from "@/lib/mobility/recommendation-engine";
import type { TimeBreakdown } from "@/lib/mobility/time-engine";
import { CLASSIFICATION_LABEL } from "@/lib/price-tracker";
import type { VideoCard } from "@/lib/videos.functions";

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
    <figure
      aria-labelledby="time-projection-title"
      className="overflow-hidden rounded-lg bg-surface p-4 ring-1 ring-line"
    >
      <figcaption id="time-projection-title" className="font-bold text-ink">
        Horas acumuladas no trajeto
      </figcaption>
      <p className="mt-1 text-xs text-muted-foreground">
        Projeção com os minutos que você informou, repetidos a cada ano. Estimativa.
      </p>
      <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-ink" /> Hoje
        </span>
        <span className="flex items-center gap-2">
          <span className="h-0.5 w-6 bg-action" /> De bike
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-2 h-auto w-full"
        role="img"
        aria-label="Horas acumuladas hoje e de bike em 1, 3 e 5 anos"
      >
        {[0, 0.5, 1].map((r) => (
          <g key={r}>
            <line
              x1={PAD_X}
              x2={WIDTH - PAD_X}
              y1={y(maxValue * r)}
              y2={y(maxValue * r)}
              className="stroke-line"
              strokeWidth="1"
            />
            <text x="2" y={y(maxValue * r) + 4} className="fill-muted-foreground text-[11px]">
              {Math.round(maxValue * r)} h
            </text>
          </g>
        ))}
        <path
          d={path("currentHours")}
          fill="none"
          className="stroke-ink"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={path("bikeHours")}
          fill="none"
          className="stroke-action"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.map((p) => (
          <text
            key={p.years}
            x={x(p.years)}
            y={HEIGHT - 6}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {p.years === 0 ? "hoje" : `${p.years} ano${p.years > 1 ? "s" : ""}`}
          </text>
        ))}
      </svg>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        {points.map((p) => (
          <div key={p.years} className="rounded-md bg-card p-2 ring-1 ring-line">
            <dt className="text-muted-foreground">
              {p.years} ano{p.years > 1 ? "s" : ""}
            </dt>
            <dd className="font-bold text-ink">
              {decimal(Math.abs(p.savedHours))} h {p.savedHours >= 0 ? "a menos" : "a mais"}
            </dd>
          </div>
        ))}
      </dl>
    </figure>
  );
}

const fmtHours = (value: number) => `${decimal(Math.abs(value))} h`;

/** Conclusão editorial; os números vêm exclusivamente do motor de tempo. */
export function CalculatorResultHero({ result }: { result: TimeBreakdown }) {
  const saved = result.savedHoursPerYear;
  const positive = saved > 0;
  return (
    <div
      className={`rounded-2xl p-6 sm:p-8 ${positive ? "bg-ink text-white" : "bg-amber-50 text-ink ring-1 ring-amber-200"}`}
    >
      <p className={`text-xs font-bold uppercase tracking-[0.18em] ${positive ? "text-mint" : "text-amber-800"}`}>
        {positive ? "O tempo que você pode recuperar" : saved < 0 ? "Seu cenário de tempo" : "Tempo equivalente"}
      </p>
      <p className="mt-3 text-5xl font-black tracking-tight sm:text-6xl">
        {fmtHours(saved)}{" "}
        <span className="block text-lg font-semibold tracking-normal sm:inline sm:text-xl">
          {positive ? "a menos por ano" : saved < 0 ? "a mais por ano de bike" : "de diferença por ano"}
        </span>
      </p>
      <p className={`mt-4 max-w-xl text-base leading-relaxed ${positive ? "text-white/85" : "text-ink/80"}`}>
        {positive
          ? `Isso equivale a cerca de ${decimal(result.savedWorkdaysPerYear)} jornadas de 8 horas. Uma projeção para os tempos que você informou, não uma promessa de trajeto.`
          : saved < 0
            ? "Nesse trajeto, a bike não traz ganho de tempo. Ainda pode fazer sentido por outros motivos; veja a comparação abaixo antes de decidir."
            : "Com os tempos informados, o trajeto leva o mesmo tempo nos dois cenários."}
      </p>
      <dl
        className={`mt-7 grid gap-4 border-t pt-5 sm:grid-cols-2 ${positive ? "border-white/20" : "border-amber-200"}`}
      >
        <div>
          <dt className="text-sm opacity-75">Hoje no trajeto, por ano</dt>
          <dd className="mt-1 text-2xl font-bold">{fmtHours(result.currentHoursPerYear)}</dd>
        </div>
        <div>
          <dt className="text-sm opacity-75">No cenário de bike, por ano</dt>
          <dd className="mt-1 text-2xl font-bold">{fmtHours(result.bikeHoursPerYear ?? 0)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** Apenas observações calculadas em 0/1/3/5 anos; área expressa a diferença, sem inventar pontos. */
export function TimeBenefitChart({ points }: { points: TimeProjectionPoint[] }) {
  const series = [{ years: 0, currentHours: 0, bikeHours: 0, savedHours: 0 }, ...points];
  const max = Math.max(1, ...series.flatMap((p) => [p.currentHours, p.bikeHours]));
  const sx = (years: number) => 52 + (years / 5) * 684;
  const sy = (hours: number) => 254 - (hours / max) * 202;
  const current = series.map((p) => `${sx(p.years)},${sy(p.currentHours)}`).join(" ");
  const bike = series.map((p) => `${sx(p.years)},${sy(p.bikeHours)}`).join(" ");
  const between = `${current} ${[...series]
    .reverse()
    .map((p) => `${sx(p.years)},${sy(p.bikeHours)}`)
    .join(" ")}`;
  const gaining = (points[0]?.savedHours ?? 0) > 0;
  const losing = (points[0]?.savedHours ?? 0) < 0;
  return (
    <figure className="rounded-2xl bg-white p-5 ring-1 ring-line sm:p-7">
      <figcaption className="text-2xl font-black text-ink">O que muda ao longo do tempo</figcaption>
      <p className="mt-1 text-sm text-muted-foreground">
        Horas acumuladas em cada cenário, repetindo os tempos que você informou.
      </p>
      <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-ink" aria-hidden="true">
        <span className="flex items-center gap-2">
          <span className="h-1 w-7 rounded-full bg-ink" /> Trajeto atual
        </span>
        <span className="flex items-center gap-2">
          <span className={`h-1 w-7 rounded-full ${losing ? "bg-amber-600" : "bg-action"}`} /> De bike
        </span>
        {(gaining || losing) && (
          <span className="flex items-center gap-2">
            <span className={`h-4 w-4 rounded-sm ${losing ? "bg-amber-200" : "bg-emerald-100"}`} />{" "}
            {gaining ? "Tempo recuperado" : "Tempo adicional"}
          </span>
        )}
      </div>
      <svg
        viewBox="0 0 790 290"
        className="mt-2 h-auto w-full"
        role="img"
        aria-label={`Tempo acumulado atual e de bike em 1, 3 e 5 anos; ${gaining ? "área verde mostra o tempo recuperado" : losing ? "área amarela mostra o tempo adicional" : "sem diferença entre os cenários"}`}
      >
        {[0, 0.5, 1].map((ratio) => (
          <g key={ratio}>
            <line x1="52" x2="736" y1={sy(max * ratio)} y2={sy(max * ratio)} stroke="#d8e5e3" strokeWidth="1" />
            <text x="5" y={sy(max * ratio) + 4} fill="#536b69" fontSize="12">
              {Math.round(max * ratio)} h
            </text>
          </g>
        ))}
        {(gaining || losing) && <polygon points={between} fill={losing ? "#fbbf24" : "#2dd4bf"} fillOpacity="0.23" />}
        <polyline
          points={current}
          fill="none"
          stroke="#173530"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={bike}
          fill="none"
          stroke={losing ? "#b45309" : "#059669"}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {series.slice(1).map((p) => (
          <g key={p.years}>
            <circle cx={sx(p.years)} cy={sy(p.currentHours)} r="5" fill="#173530" />
            <circle cx={sx(p.years)} cy={sy(p.bikeHours)} r="5" fill={losing ? "#b45309" : "#059669"} />
            <text x={sx(p.years)} y="282" textAnchor="middle" fill="#536b69" fontSize="13">
              {p.years} {p.years === 1 ? "ano" : "anos"}
            </text>
          </g>
        ))}
      </svg>
      <dl className="mt-5 grid gap-3 sm:grid-cols-3">
        {points.map((p) => (
          <div key={p.years} className="border-l-4 border-action pl-3">
            <dt className="text-sm text-muted-foreground">
              Em {p.years} {p.years === 1 ? "ano" : "anos"}
            </dt>
            <dd className="text-lg font-black text-ink">
              {fmtHours(p.savedHours)}{" "}
              {p.savedHours > 0 ? "recuperadas" : p.savedHours < 0 ? "adicionais" : "de diferença"}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-muted-foreground">
        Projeção linear apenas dos três horizontes calculados. Não considera mudanças futuras no trânsito ou no trajeto.
      </p>
    </figure>
  );
}

export function BikeScenarioCard({
  bike,
  dailyKm,
  position,
}: {
  bike: RecommendedBike;
  dailyKm: number;
  position: "calculadora_tempo_no_transito";
}) {
  const role =
    bike.role === "economica"
      ? "Menor preço compatível"
      : (bike.tradeoff?.extraAutonomyKm ?? 0) > 0
        ? "Mais autonomia para comparar"
        : "Outra opção compatível";
  const label = bike.radarClassification
    ? CLASSIFICATION_LABEL[bike.radarClassification]
    : bike.monitored
      ? "Acompanhe no Radar"
      : null;
  return (
    <article className="overflow-hidden rounded-2xl bg-white ring-1 ring-line">
      <div className="relative">
        <BikeMedia src={bike.image} name={bike.name} className="aspect-[16/10] w-full bg-surface object-contain" />
        <span className="absolute left-4 top-4 rounded-full bg-ink px-3 py-1.5 text-xs font-bold text-white">
          {role}
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-2xl font-black text-ink">{bike.name}</h3>
          {label && <span className="rounded-full bg-mint/25 px-3 py-1 text-xs font-bold text-ink">{label}</span>}
        </div>
        <p className="mt-2 text-3xl font-black text-action">{brl(bike.price)}</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Preço da oferta atual registrada pela Vitale; disponibilidade pode mudar no Mercado Livre.
        </p>
        <p className="mt-4 text-sm font-medium text-ink">
          Autonomia declarada: {bike.autonomyKm} km · Capacidade: {bike.capacity ?? "não informada"}
          {bike.capacity ? ` pessoa${bike.capacity === 1 ? "" : "s"}` : ""}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Cobre seus {decimal(dailyKm)} km diários com a margem considerada na calculadora. O tempo de bike foi
          informado por você; não é previsão de velocidade deste modelo.
        </p>
        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          <Link
            to="/bikes/$slug"
            params={{ slug: bike.slug }}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-bold text-ink hover:bg-surface"
          >
            <Bike className="h-4 w-4" /> Conhecer a bike
          </Link>
          {bike.monitored && (
            <Link
              to="/radar/$bikeId"
              params={{ bikeId: bike.bikeId }}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-bold text-ink hover:bg-surface"
            >
              <LineChart className="h-4 w-4" /> Preço e histórico
            </Link>
          )}
          <a
            href={bike.link}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={() => trackAffiliateClick({ bike_id: bike.bikeId, position })}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-action px-4 text-sm font-bold text-primary-foreground hover:bg-action/90 sm:col-span-2"
          >
            Ver oferta no Mercado Livre <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </article>
  );
}

export function BikeComparison({ bikes }: { bikes: RecommendedBike[] }) {
  if (bikes.length !== 2) return null;
  const [a, b] = bikes;
  return (
    <section aria-labelledby="bike-comparison" className="rounded-2xl bg-surface p-5 ring-1 ring-line sm:p-7">
      <h3 id="bike-comparison" className="text-xl font-black text-ink">
        Compare as duas opções
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Diferenças verificáveis para decidir sem escolher uma vencedora por você.
      </p>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[450px] text-left text-sm">
          <thead>
            <tr className="border-b border-line">
              <th className="py-3 pr-4">Critério</th>
              <th className="py-3 pr-4">{a.name}</th>
              <th className="py-3">{b.name}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Preço atual</th>
              <td className="py-3 pr-4 font-bold">{brl(a.price)}</td>
              <td className="py-3 font-bold">{brl(b.price)}</td>
            </tr>
            <tr className="border-b border-line">
              <th className="py-3 pr-4 font-medium">Autonomia declarada</th>
              <td className="py-3 pr-4">{a.autonomyKm} km</td>
              <td className="py-3">{b.autonomyKm} km</td>
            </tr>
            <tr>
              <th className="py-3 pr-4 font-medium">Capacidade</th>
              <td className="py-3 pr-4">{a.capacity ?? "Não informada"}</td>
              <td className="py-3">{b.capacity ?? "Não informada"}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function QuizCtaBanner() {
  return <QuizBanner />;
}

export function RadarCta() {
  return (
    <section className="flex flex-col gap-4 rounded-2xl bg-mint/20 p-6 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-xl font-black text-ink">Quer acompanhar uma oportunidade melhor?</h2>
        <p className="mt-1 text-sm text-ink/80">
          Veja a variação real dos preços antes de decidir. O Radar mostra o histórico, não uma promessa de desconto.
        </p>
      </div>
      <Link
        to="/radar"
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-ink px-5 text-sm font-bold text-white"
      >
        Abrir Radar <ArrowRight className="h-4 w-4" />
      </Link>
    </section>
  );
}

export function RelatedContent({ videos }: { videos: VideoCard[] }) {
  if (!videos.length) return null;
  return (
    <section aria-labelledby="related-video-title">
      <div className="flex items-center gap-2">
        <Youtube className="h-5 w-5 text-action" />
        <h2 id="related-video-title" className="text-2xl font-black text-ink">
          Testes reais das bikes sugeridas
        </h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Vídeos associados a esses modelos na base da Vitale.</p>
      <VideoCards videos={videos} className="mt-5" />
    </section>
  );
}

export function RelatedTools() {
  const tools = [
    {
      to: "/calculadoras/economia" as const,
      title: "Quanto posso economizar?",
      text: "Veja o impacto financeiro no trajeto que você faria de bike.",
    },
    {
      to: "/calculadoras/payback" as const,
      title: "Em quanto tempo a bike se paga?",
      text: "Compare investimento e custos no cenário informado.",
    },
    {
      to: "/calculadoras/carro-vs-bike" as const,
      title: "Carro ou bike?",
      text: "Explore os custos de cada opção para o seu uso.",
    },
  ];
  return (
    <section aria-labelledby="related-tools-title">
      <h2 id="related-tools-title" className="text-2xl font-black text-ink">
        Continue sua análise
      </h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {tools.map((tool) => (
          <Link key={tool.to} to={tool.to} className="group rounded-xl bg-white p-5 ring-1 ring-line hover:ring-action">
            <Clock3 className="h-6 w-6 text-action" />
            <h3 className="mt-3 font-black text-ink group-hover:underline">{tool.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{tool.text}</p>
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-action">
              Abrir ferramenta <ArrowRight className="h-4 w-4" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
