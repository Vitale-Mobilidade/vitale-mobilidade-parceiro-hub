import { createServerFn } from "@tanstack/react-start";
import { fetchQuizCatalog } from "./quiz-catalog-repository.server";
import { fetchBikeCatalogFromDb } from "./bikes-repository.server";
import { fetchTrackerCatalog } from "./radar-repository.server";
import { MELI_LINK_RE } from "./mobility/config";
import { buildRadarEntries, type RadarBike } from "./radar-rankings";
import type { MobilityBikeCandidate } from "./mobility/recommendation-engine";

/**
 * Candidatas da calculadora de economia: interseção EXATA por bikeId entre
 *  - `get_quiz_catalog` (elegibilidade/atividade comercial já decidida na fonte) e
 *  - `get_bikes_public_catalog` (par atômico preço+link da oferta atual).
 * Sem fallback estático: se uma das fontes falhar, devolvemos ok:false e a página diz isso.
 * `monitored` só é true quando a bike aparece no catálogo ativo do Radar.
 */
type QuizItem = {
  id?: unknown;
  status?: unknown;
  autonomyKm?: unknown;
  capacity?: unknown;
  terrains?: unknown;
  bestFor?: unknown;
};

const strArr = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : null;

/** Só evidência positiva e exata; nada de regex/IA sobre descrições. */
export function hasHillTag(q: { terrains?: unknown; bestFor?: unknown }): boolean {
  return Boolean(strArr(q.terrains)?.includes("muitas_subidas") || strArr(q.bestFor)?.includes("subidas"));
}

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null);

export const getMobilityBikeCandidates = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; candidates: MobilityBikeCandidate[] }> => {
    const [quiz, catalog, tracker] = await Promise.all([
      fetchQuizCatalog().catch(() => ({ ok: false as const })),
      fetchBikeCatalogFromDb().catch(() => null),
      fetchTrackerCatalog().catch(() => ({ ok: false as const })),
    ]);
    if (!quiz.ok || !catalog) return { ok: false, candidates: [] };

    const quizById = new Map<string, QuizItem>();
    for (const raw of quiz.bikes as QuizItem[]) {
      if (raw && typeof raw.id === "string" && raw.status === "eligible") quizById.set(raw.id, raw);
    }

    const monitored = new Set<string>();
    const radarById = new Map<
      string,
      { currentPrice: number; link: string; classification: NonNullable<MobilityBikeCandidate["radarClassification"]> }
    >();
    if (tracker.ok && Array.isArray(tracker.data)) {
      for (const it of tracker.data as Array<{ id?: unknown }>) {
        if (it && typeof it.id === "string") monitored.add(it.id);
      }
      for (const entry of buildRadarEntries(tracker.data as RadarBike[], "all")) {
        radarById.set(entry.id, {
          currentPrice: entry.currentPrice,
          link: entry.link,
          classification: entry.metrics.classification,
        });
      }
    }

    const candidates: MobilityBikeCandidate[] = [];
    for (const b of catalog) {
      const q = quizById.get(b.bikeId);
      if (!q) continue;
      const price = num(b.sheetPrice);
      const link = typeof b.link === "string" && MELI_LINK_RE.test(b.link) ? b.link : null;
      if (!price || !link) continue;
      const radar = radarById.get(b.bikeId);
      candidates.push({
        bikeId: b.bikeId,
        slug: b.slug,
        name: b.name,
        image: b.image,
        price,
        link,
        autonomyKm: num(q.autonomyKm),
        capacity: num(q.capacity),
        monitored: monitored.has(b.bikeId),
        radarClassification:
          radar && Math.abs(radar.currentPrice - price) < 0.01 && radar.link === link ? radar.classification : null,
        hillTagged: hasHillTag(q),
      });
    }
    return { ok: true, candidates };
  },
);
