/**
 * Radar de Preços — montagem das entradas públicas, ordenações e destaques.
 * Tudo é derivado do histórico real: nada de urgência artificial.
 */

import { dailyMetrics, distanceToMinPct, normalizeText, type DailyMetrics, type DailyPoint, type DailyWindow } from "./price-daily";
import { isSafePurchaseLink, type Classification } from "./price-tracker";

export interface RadarBike {
  id: string;
  name: string;
  currentPrice: number;
  link: string;
  image: string | null;
  shortDescription?: string | null;
  strengths?: string[] | null;
  daily: DailyPoint[];
  firstObservedAt: string | null;
  lastObservedAt: string | null;
  observations: number;
  minObserved: number | null;
  maxObserved: number | null;
}

export interface RadarEntry extends RadarBike {
  metrics: DailyMetrics;
  /** Menor preço já registrado (histórico completo). */
  allTimeMin: number | null;
  /** Economia contra o preço típico, quando houver leitura confiável. */
  savingsAbs: number | null;
  savingsPct: number | null;
  /** Queda percentual contra o preço distinto anterior (negativo = caiu). */
  dropPct: number | null;
  /** Distância percentual até o menor preço registrado. */
  distanceToMinPct: number | null;
}

export type SortKey = "opportunity" | "drop" | "price" | "name";

export const SORT_LABEL: Record<SortKey, string> = {
  opportunity: "Melhor oportunidade",
  drop: "Maior queda",
  price: "Menor preço",
  name: "A–Z",
};

export type ChipKey = "lowest" | "recent_drop" | "under_5k" | "5k_8k" | "over_8k";

export const CHIP_LABEL: Record<ChipKey, string> = {
  lowest: "No menor preço",
  recent_drop: "Caiu recentemente",
  under_5k: "Até R$ 5.000",
  "5k_8k": "R$ 5.000 a R$ 8.000",
  over_8k: "Acima de R$ 8.000",
};

export function buildRadarEntries(
  bikes: RadarBike[],
  window: DailyWindow = "all",
  today?: string,
): RadarEntry[] {
  return (bikes ?? [])
    .filter((b) => !!b && b.currentPrice > 0 && isSafePurchaseLink(b.link))
    .map((b) => {
      const metrics = dailyMetrics({ daily: b.daily ?? [], currentPrice: b.currentPrice }, window, today);
      const allTimeMin =
        b.minObserved !== null && b.minObserved !== undefined
          ? Math.min(Number(b.minObserved), metrics.minPrice ?? Number(b.minObserved))
          : metrics.minPrice;
      const reliable = metrics.classification !== "forming" && metrics.typicalPrice !== null;
      const savingsAbs = reliable ? (metrics.typicalPrice as number) - b.currentPrice : null;
      const savingsPct =
        reliable && metrics.typicalPrice ? ((savingsAbs as number) / (metrics.typicalPrice as number)) * 100 : null;
      return {
        ...b,
        metrics,
        allTimeMin,
        savingsAbs,
        savingsPct,
        dropPct: metrics.deltaPct,
        distanceToMinPct: distanceToMinPct(b.currentPrice, allTimeMin),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
}

export function sortEntries(entries: RadarEntry[], key: SortKey): RadarEntry[] {
  const out = [...entries];
  switch (key) {
    case "opportunity":
      return out.sort((a, b) => (b.savingsPct ?? -Infinity) - (a.savingsPct ?? -Infinity));
    case "drop":
      return out.sort((a, b) => (a.dropPct ?? Infinity) - (b.dropPct ?? Infinity));
    case "price":
      return out.sort((a, b) => a.currentPrice - b.currentPrice);
    default:
      return out.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
  }
}

export function matchesChips(entry: RadarEntry, chips: ChipKey[]): boolean {
  return chips.every((chip) => {
    switch (chip) {
      case "lowest":
        return entry.metrics.classification === "lowest";
      case "recent_drop":
        return (entry.dropPct ?? 0) < 0;
      case "under_5k":
        return entry.currentPrice <= 5000;
      case "5k_8k":
        return entry.currentPrice > 5000 && entry.currentPrice <= 8000;
      case "over_8k":
        return entry.currentPrice > 8000;
      default:
        return true;
    }
  });
}

export function searchEntries(entries: RadarEntry[], query: string): RadarEntry[] {
  const q = normalizeText(query);
  if (!q) return entries;
  return entries.filter((e) => normalizeText(e.name).includes(q));
}

export interface RadarHighlights {
  bestPrices: RadarEntry[];
  biggestDrops: RadarEntry[];
  nearMin: RadarEntry[];
}

/** Destaques com dado real e sem repetir a mesma bike quando há alternativa. */
export function buildHighlights(entries: RadarEntry[], perBlock = 3): RadarHighlights {
  const reliable = entries.filter((e) => e.metrics.classification !== "forming");
  const used = new Set<string>();

  const take = (list: RadarEntry[]) => {
    const picked: RadarEntry[] = [];
    for (const e of list) {
      if (picked.length >= perBlock) break;
      if (used.has(e.id)) continue;
      picked.push(e);
      used.add(e.id);
    }
    // Se não houve alternativa suficiente, completa permitindo repetição.
    for (const e of list) {
      if (picked.length >= perBlock) break;
      if (picked.some((p) => p.id === e.id)) continue;
      picked.push(e);
    }
    return picked;
  };

  const bestPrices = take(
    reliable
      .filter((e) => (e.savingsPct ?? 0) > 0)
      .sort((a, b) => (b.savingsPct ?? 0) - (a.savingsPct ?? 0)),
  );
  const biggestDrops = take(
    reliable.filter((e) => (e.dropPct ?? 0) < 0).sort((a, b) => (a.dropPct ?? 0) - (b.dropPct ?? 0)),
  );
  const nearMin = take(
    reliable
      .filter((e) => (e.distanceToMinPct ?? Infinity) <= 3)
      .sort((a, b) => (a.distanceToMinPct ?? 0) - (b.distanceToMinPct ?? 0)),
  );

  return { bestPrices, biggestDrops, nearMin };
}

export interface RadarSummary {
  tracked: number;
  atLowest: number;
  biggestDropPct: number | null;
}

export function buildSummary(entries: RadarEntry[]): RadarSummary {
  const atLowest = entries.filter((e) => e.metrics.classification === "lowest").length;
  const drops = entries.map((e) => e.dropPct).filter((d): d is number => typeof d === "number" && d < 0);
  return {
    tracked: entries.length,
    atLowest,
    biggestDropPct: drops.length ? Math.min(...drops) : null,
  };
}

/** Diagnóstico curto e honesto, sempre baseado no histórico registrado. */
export function shortDiagnosis(entry: RadarEntry): string {
  const { classification, typicalPrice } = entry.metrics;
  if (classification === "forming") return "Histórico em formação — ainda observando este preço.";
  const diff = typicalPrice !== null ? typicalPrice - entry.currentPrice : 0;
  if (classification === "lowest") return "É o menor preço que já registramos para esta bike.";
  if (classification === "good") return `Hoje está R$ ${Math.round(diff).toLocaleString("pt-BR")} abaixo do preço típico.`;
  if (classification === "typical") return "Está dentro da faixa de preço mais comum do período.";
  return `Hoje está R$ ${Math.round(Math.abs(diff)).toLocaleString("pt-BR")} acima do preço típico.`;
}

export const CLASSIFICATION_COLOR: Record<Classification, string> = {
  forming: "bg-muted text-muted-foreground",
  lowest: "bg-primary text-primary-foreground",
  good: "bg-primary/15 text-primary",
  typical: "bg-amber-100 text-amber-900",
  above: "bg-destructive/10 text-destructive",
};
