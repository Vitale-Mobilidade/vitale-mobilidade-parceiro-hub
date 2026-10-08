import { createServerFn } from "@tanstack/react-start";
import { fetchVideoCatalog } from "./video-catalog.server";
import { BIKE_ID_RE } from "./bike-identity";
import { selectCatalogVideos } from "./video-catalog";

export type VideoCard = { videoId: string; title: string; date: string | null; url: string; thumbnail: string };

/** Sem bikeId: vídeos mais recentes (qualquer). Com bikeId: só vídeos associados a esse modelo. */
export const getVideos = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { bikeId?: unknown; limit?: unknown };
    const bikeId = typeof d.bikeId === "string" && BIKE_ID_RE.test(d.bikeId) ? d.bikeId.toLowerCase() : null;
    const limit =
      d.limit === null
        ? null
        : typeof d.limit === "number" && Number.isFinite(d.limit)
        ? Math.min(Math.max(1, Math.floor(d.limit)), 200)
        : bikeId
          ? null
          : 4;
    return { bikeId, limit };
  })
  .handler(async ({ data }): Promise<VideoCard[]> => {
    const all = await fetchVideoCatalog();
    return selectCatalogVideos(all, data.bikeId, data.limit).map(({ videoId, title, date, url, thumbnail }) => ({
      videoId,
      title,
      date,
      url,
      thumbnail,
    }));
  });

export async function safeVideos(input: { bikeId?: string; limit?: number | null }): Promise<VideoCard[]> {
  try {
    return await getVideos({ data: input });
  } catch {
    return [];
  }
}

/** Public sheet metadata only; transcripts and editorial state are loaded by the protected admin API. */
export const getSheetVideoCatalog = createServerFn({ method: "GET" }).handler(async () => {
  return fetchVideoCatalog();
});
