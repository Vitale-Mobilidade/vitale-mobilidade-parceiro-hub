import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import { fetchBikeHistory, fetchTrackerSplit } from "./radar-repository.server";

export const getRadarCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const r = await fetchTrackerSplit();
  // JSON serializável: dados já vêm como JSON da RPC.
  // `bikes` = oferta atual válida; `archived` = histórico sem oferta (sem preço/link).
  return r.ok
    ? {
        ok: true as const,
        bikes: JSON.parse(JSON.stringify(r.data.active)) as Json[],
        archived: JSON.parse(JSON.stringify(r.data.archived)) as Json[],
      }
    : { ok: false as const };
});

export const getRadarBike = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const bikeId = (data as { bikeId?: unknown })?.bikeId;
    return { bikeId: typeof bikeId === "string" ? bikeId.slice(0, 64) : "" };
  })
  .handler(async ({ data }) => {
    const r = await fetchBikeHistory(data.bikeId);
    return r.ok
      ? { ok: true as const, bike: JSON.parse(JSON.stringify(r.data ?? null)) as Json }
      : { ok: false as const };
  });

/** Cabeçalhos do documento SSR quando a leitura do Radar falha; src/server.ts converte o marcador em 503. */
export const RADAR_UNAVAILABLE_HEADERS: Record<string, string> = {
  "Retry-After": "120",
  "Cache-Control": "no-store",
  "X-Vitale-Radar-Unavailable": "1",
};
