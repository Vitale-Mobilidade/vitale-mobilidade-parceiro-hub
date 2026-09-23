import { createServerFn } from "@tanstack/react-start";
import { fetchBikeCatalog } from "./editorial-bikes.server";
import { SLUG_RE, type CatalogBike } from "./editorial-bikes";

export type { CatalogBike };

export const getBikeCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ ok: boolean; bikes: CatalogBike[] }> => {
    const bikes = await fetchBikeCatalog();
    return bikes ? { ok: true, bikes } : { ok: false, bikes: [] };
  },
);

export const getCatalogBike = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => {
    const slug = String((d as { slug?: unknown })?.slug ?? "").toLowerCase();
    return { slug: SLUG_RE.test(slug) && slug.length <= 60 ? slug : "" };
  })
  .handler(async ({ data }): Promise<{ ok: boolean; bike: CatalogBike | null }> => {
    const bikes = await fetchBikeCatalog();
    if (!bikes) return { ok: false, bike: null };
    return { ok: true, bike: data.slug ? (bikes.find((b) => b.slug === data.slug) ?? null) : null };
  });
