import { createServerFn } from "@tanstack/react-start";
import { fetchBikeHistory, fetchTrackerCatalog } from "./radar-repository.server";

export const getRadarCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const r = await fetchTrackerCatalog();
  // JSON serializável: dados já vêm como JSON da RPC.
  return r.ok ? { ok: true as const, bikes: JSON.parse(JSON.stringify(r.data)) as unknown[] } : { ok: false as const };
});

export const getRadarBike = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => {
    const bikeId = (data as { bikeId?: unknown })?.bikeId;
    return { bikeId: typeof bikeId === "string" ? bikeId.slice(0, 64) : "" };
  })
  .handler(async ({ data }) => {
    const r = await fetchBikeHistory(data.bikeId);
    return r.ok
      ? { ok: true as const, bike: JSON.parse(JSON.stringify(r.data ?? null)) as unknown }
      : { ok: false as const };
  });
