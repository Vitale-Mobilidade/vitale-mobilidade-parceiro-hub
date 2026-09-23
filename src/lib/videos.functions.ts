import { createServerFn } from "@tanstack/react-start";
import { fetchVideoCatalog } from "./video-catalog.server";
import { BIKE_ID_RE } from "./bike-identity";

export type VideoCard = { videoId: string; title: string; date: string | null; url: string; thumbnail: string };

/** Sem bikeId: vídeos mais recentes (qualquer). Com bikeId: só vídeos associados a esse modelo. */
export const getVideos = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const d = (data ?? {}) as { bikeId?: unknown; limit?: unknown };
    const bikeId = typeof d.bikeId === "string" && BIKE_ID_RE.test(d.bikeId) ? d.bikeId.toLowerCase() : null;
    const limit = typeof d.limit === "number" ? Math.min(Math.max(1, Math.floor(d.limit)), 60) : 4;
    return { bikeId, limit };
  })
  .handler(async ({ data }): Promise<VideoCard[]> => {
    const all = await fetchVideoCatalog();
    const list = data.bikeId ? all.filter((v) => v.bikeIds.includes(data.bikeId!)) : all;
    return list.slice(0, data.limit).map(({ videoId, title, date, url, thumbnail }) => ({ videoId, title, date, url, thumbnail }));
  });

export async function safeVideos(input: { bikeId?: string; limit?: number }): Promise<VideoCard[]> {
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
