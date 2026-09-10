/**
 * Radar de Preços de Bikes — cálculo determinístico e conservador.
 *
 * Regras (nunca inventar dado):
 *  - "Preço típico" é a MÉDIA PONDERADA PELO TEMPO de vigência de cada preço
 *    dentro da janela (7/30/90 dias), não a média simples dos eventos.
 *  - Classificação só existe com histórico suficiente: menos de 14 dias
 *    acompanhados OU menos de 2 preços distintos => "Histórico em formação".
 *  - Nunca usamos a expressão "preço justo de mercado" nem comparação com
 *    outras lojas: tudo é "com base no histórico registrado desde DD/MM/AAAA".
 */

export interface PricePoint {
  t: string;
  price: number;
  source?: string | null;
  confidence?: string | null;
}

export interface TrackerBike {
  id: string;
  name: string;
  currentPrice: number;
  link: string;
  image: string | null;
  points: PricePoint[];
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  observations: number;
  minObserved: number | null;
  maxObserved: number | null;
}

export type Classification = "forming" | "lowest" | "good" | "typical" | "above";

export interface PriceStats {
  /** Preço típico ponderado pelo tempo dentro da janela; null sem dados. */
  typicalPrice: number | null;
  minObserved: number | null;
  maxObserved: number | null;
  /** Último preço distinto anterior ao atual (null se nunca mudou). */
  previousPrice: number | null;
  deltaAbs: number | null;
  deltaPct: number | null;
  daysTracked: number;
  distinctPrices: number;
  observations: number;
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  classification: Classification;
  /** Série pronta para o gráfico dentro da janela. */
  series: PricePoint[];
}

export const DAY_MS = 24 * 60 * 60 * 1000;
export const WINDOWS = [7, 30, 90] as const;
export type WindowDays = (typeof WINDOWS)[number];

export function clampWindow(days: number): WindowDays {
  if (days <= 7) return 7;
  if (days <= 30) return 30;
  return 90;
}

function sortPoints(points: PricePoint[]): PricePoint[] {
  return points
    .filter((p) => p && typeof p.price === "number" && p.price > 0 && !!p.t)
    .map((p) => ({ ...p, price: Number(p.price) }))
    .sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());
}

/** Média ponderada pelo tempo de vigência dentro da janela. */
export function timeWeightedTypicalPrice(
  points: PricePoint[],
  days: number,
  now: Date = new Date(),
): number | null {
  const sorted = sortPoints(points);
  if (sorted.length === 0) return null;
  const start = now.getTime() - days * DAY_MS;

  const anchor = [...sorted].reverse().find((p) => new Date(p.t).getTime() < start);
  const seq: { t: number; price: number }[] = [];
  if (anchor) seq.push({ t: start, price: anchor.price });
  for (const p of sorted) {
    const t = new Date(p.t).getTime();
    if (t < start) continue;
    seq.push({ t: Math.max(t, start), price: p.price });
  }
  if (seq.length === 0) return null;

  let weighted = 0;
  let total = 0;
  for (let i = 0; i < seq.length; i++) {
    const end = i + 1 < seq.length ? seq[i + 1].t : now.getTime();
    const w = Math.max(end - seq[i].t, 0);
    weighted += seq[i].price * w;
    total += w;
  }
  if (total <= 0) return seq[seq.length - 1].price;
  return weighted / total;
}

export function classifyPrice(input: {
  currentPrice: number;
  typicalPrice: number | null;
  minObserved: number | null;
  daysTracked: number;
  distinctPrices: number;
}): Classification {
  const { currentPrice, typicalPrice, minObserved, daysTracked, distinctPrices } = input;
  if (daysTracked < 14 || distinctPrices < 2 || typicalPrice === null) return "forming";
  if (minObserved !== null && currentPrice <= minObserved) return "lowest";
  if (currentPrice <= typicalPrice * 0.95) return "good";
  if (currentPrice <= typicalPrice * 1.05) return "typical";
  return "above";
}

/** Métricas completas de uma bike para a janela informada. */
export function computeStats(
  bike: Pick<TrackerBike, "points" | "currentPrice" | "minObserved" | "maxObserved" | "firstObservedAt" | "lastObservedAt" | "observations">,
  days: number = 30,
  now: Date = new Date(),
): PriceStats {
  const sorted = sortPoints(bike.points ?? []);
  const start = now.getTime() - days * DAY_MS;
  const series = sorted.filter((p) => new Date(p.t).getTime() >= start);

  const prices = sorted.map((p) => p.price);
  const minObserved = bike.minObserved ?? (prices.length ? Math.min(...prices) : null);
  const maxObserved = bike.maxObserved ?? (prices.length ? Math.max(...prices) : null);

  const distinct: number[] = [];
  for (const p of prices) if (!distinct.includes(p)) distinct.push(p);

  // Preço anterior = último valor distinto do atual, olhando de trás para frente.
  let previousPrice: number | null = null;
  for (let i = prices.length - 1; i >= 0; i--) {
    if (prices[i] !== bike.currentPrice) {
      previousPrice = prices[i];
      break;
    }
  }

  const firstObservedAt = bike.firstObservedAt ?? (sorted[0]?.t ?? null);
  const lastObservedAt = bike.lastObservedAt ?? (sorted[sorted.length - 1]?.t ?? null);
  const daysTracked = firstObservedAt
    ? Math.max((now.getTime() - new Date(firstObservedAt).getTime()) / DAY_MS, 0)
    : 0;

  const typicalPrice = timeWeightedTypicalPrice(sorted, days, now);
  const deltaAbs = previousPrice === null ? null : bike.currentPrice - previousPrice;
  const deltaPct = previousPrice === null || previousPrice === 0 ? null : (deltaAbs! / previousPrice) * 100;

  return {
    typicalPrice,
    minObserved,
    maxObserved,
    previousPrice,
    deltaAbs,
    deltaPct,
    daysTracked,
    distinctPrices: distinct.length,
    observations: bike.observations ?? sorted.length,
    firstObservedAt,
    lastObservedAt,
    classification: classifyPrice({
      currentPrice: bike.currentPrice,
      typicalPrice,
      minObserved,
      daysTracked,
      distinctPrices: distinct.length,
    }),
    series,
  };
}

export const CLASSIFICATION_LABEL: Record<Classification, string> = {
  forming: "Histórico em formação",
  lowest: "Menor preço observado",
  good: "Bom preço",
  typical: "Na faixa típica",
  above: "Acima do histórico",
};

export const CLASSIFICATION_HINT: Record<Classification, string> = {
  forming: "Ainda não há histórico suficiente para uma leitura confiável.",
  lowest: "É o menor preço que já registramos para esta bike.",
  good: "Está abaixo do preço típico do período acompanhado.",
  typical: "Está dentro da faixa de preço mais comum do período.",
  above: "Está acima do preço típico do período acompanhado.",
};

export const CLASSIFICATION_TONE: Record<Classification, string> = {
  forming: "bg-muted text-muted-foreground",
  lowest: "bg-primary text-primary-foreground",
  good: "bg-primary/15 text-primary",
  typical: "bg-secondary text-secondary-foreground",
  above: "bg-destructive/10 text-destructive",
};

export function formatBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

export function formatDateBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatDateBR(iso)} às ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
}

/** Link de compra: só aceitamos o Link Vitale completo com https://. */
export function isSafePurchaseLink(link: string | null | undefined): boolean {
  return typeof link === "string" && /^https:\/\/[^\s]+$/.test(link);
}

export interface TrackerEntry extends TrackerBike {
  stats: PriceStats;
}

/** Aplica os cálculos a todo o catálogo e ordena A-Z (pt-BR). */
export function buildTrackerEntries(
  bikes: TrackerBike[],
  days = 30,
  now: Date = new Date(),
): TrackerEntry[] {
  return (bikes ?? [])
    .filter((b) => !!b && b.currentPrice > 0 && isSafePurchaseLink(b.link))
    .map((b) => ({ ...b, stats: computeStats(b, days, now) }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

/** Destaques só quando os dados sustentam — nunca preenchemos por preencher. */
export function pickHighlights(entries: TrackerEntry[]) {
  const withHistory = entries.filter((e) => e.stats.classification !== "forming");
  const opportunities = withHistory
    .filter((e) => e.stats.classification === "good" || e.stats.classification === "lowest")
    .sort((a, b) => (a.stats.typicalPrice! - a.currentPrice) / a.currentPrice - (b.stats.typicalPrice! - b.currentPrice) / b.currentPrice)
    .reverse()
    .slice(0, 3);
  const drops = withHistory
    .filter((e) => (e.stats.deltaPct ?? 0) < 0)
    .sort((a, b) => (a.stats.deltaPct ?? 0) - (b.stats.deltaPct ?? 0))
    .slice(0, 3);
  const lowest = withHistory.filter((e) => e.stats.classification === "lowest").slice(0, 3);
  return { opportunities, drops, lowest };
}
