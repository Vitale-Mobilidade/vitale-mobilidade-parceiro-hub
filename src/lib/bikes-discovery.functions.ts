import { createServerFn } from "@tanstack/react-start";
import { fetchBikeCatalogFromDb } from "./bikes-repository.server";
import { fetchTrackerCatalog } from "./radar-repository.server";
import { fetchVideoCatalog } from "./video-catalog.server";
import { buildRadarEntries, type RadarBike } from "./radar-rankings";
import type { Classification } from "./price-tracker";
import type { CatalogBike } from "./editorial-bikes";
import type { VideoCard } from "./videos.functions";

/**
 * Leitura read-only para a página /bikes: catálogo editorial (aba de bikes, 30 linhas)
 * + junção por bikeId com o catálogo público do Radar (preço atual e classificação
 * já calculados por buildRadarEntries) + contagem real de vídeos associados.
 * Nada é escrito; nada é inventado — campos ausentes ficam null.
 */
export type DiscoveryBike = CatalogBike & {
  autonomyKm: number | null;
  capacityPeople: number | null;
  videoCount: number | null;
  radar: { currentPrice: number; classification: Classification; typicalPrice?: number | null; allTimeMin?: number | null } | null;
};

export function parseKm(v: string | null): number | null {
  const m = v?.match(/(\d{1,4})\s*km/i);
  return m ? Number(m[1]) : null;
}
export function parsePeople(v: string | null): number | null {
  const m = v?.match(/^(\d)\s*pessoas?$/i);
  return m ? Number(m[1]) : null;
}

export const getBikesDiscovery = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; radarOk: boolean; videosOk: boolean; bikes: DiscoveryBike[]; videos: VideoCard[] }> => {
    const [catalog, radar, videos] = await Promise.all([
      fetchBikeCatalogFromDb().catch(() => null),
      fetchTrackerCatalog().catch(() => ({ ok: false as const })),
      fetchVideoCatalog().catch(() => []),
    ]);
    if (!catalog) return { ok: false, radarOk: false, videosOk: false, bikes: [], videos: [] };

    const radarMap = new Map<string, NonNullable<DiscoveryBike["radar"]>>();
    if (radar.ok) {
      for (const e of buildRadarEntries(radar.data as unknown as RadarBike[], "all")) {
        radarMap.set(e.id, { currentPrice: e.currentPrice, classification: e.metrics.classification, typicalPrice: e.metrics.typicalPrice ?? null, allTimeMin: e.allTimeMin ?? null });
      }
    }
    const videosOk = videos.length > 0;
    const counts = new Map<string, number>();
    for (const v of videos) for (const id of v.bikeIds) counts.set(id, (counts.get(id) ?? 0) + 1);

    const bikes = catalog.map((b) => ({
      ...b,
      autonomyKm: parseKm(b.autonomy),
      capacityPeople: parsePeople(b.capacity),
      videoCount: videosOk ? (counts.get(b.bikeId) ?? 0) : null,
      radar: radarMap.get(b.bikeId) ?? null,
    }));
    const related = videos
      .filter((v) => v.bikeIds.length > 0)
      .slice(0, 4)
      .map(({ videoId, title, date, url, thumbnail }) => ({ videoId, title, date, url, thumbnail }));
    return { ok: true, radarOk: radar.ok, videosOk, bikes, videos: related };
  },
);
