import { createServerFn, createServerOnlyFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import { fetchBikeHistory, fetchTrackerCatalog } from "./radar-repository.server";

export const getRadarCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const r = await fetchTrackerCatalog();
  // JSON serializável: dados já vêm como JSON da RPC.
  return r.ok ? { ok: true as const, bikes: JSON.parse(JSON.stringify(r.data)) as Json[] } : { ok: false as const };
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

/**
 * Marca a resposta do documento SSR como indisponível temporariamente (503 + Retry-After).
 * Chamado pelos loaders do Radar somente durante o SSR (mesma requisição do documento),
 * nunca em navegação no cliente — assim a resposta RPC das server functions não é afetada.
 */
export const markRadarUnavailable = createServerOnlyFn(async () => {
  const { setResponseStatus, setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseStatus(503, "Service Unavailable");
  setResponseHeader("Retry-After", "120");
  setResponseHeader("Cache-Control", "no-store");
  return null;
});

/**
 * Marca a resposta do documento SSR como não encontrada (404).
 * Chamado pelos loaders do Radar somente durante o SSR quando a leitura deu certo
 * mas a bike não existe (ID inválido ou desconhecido).
 */
export const markRadarNotFound = createServerOnlyFn(async () => {
  const { setResponseStatus, setResponseHeader } = await import("@tanstack/react-start/server");
  setResponseStatus(404, "Not Found");
  setResponseHeader("Cache-Control", "no-store");
  return null;
});
