import { BIKE_ID_RE } from "./bike-identity";

type LegacyBike = { slug: string; bikeId: string };

export function legacyBikeSlug(pathname: string): string | null {
  return (
    /^\/bikes\/([a-z0-9]+(?:-[a-z0-9]+)*)\/?$/.exec(pathname)?.[1] ??
    null
  );
}

/** Resposta HTTP do alias de detalhe; nunca deriva bikeId a partir do slug. */
export function legacyBikeRedirectResponse(
  slug: string,
  search: string,
  catalog: ReadonlyArray<LegacyBike> | null,
): Response {
  if (!catalog)
    return new Response(null, {
      status: 503,
      headers: {
        "cache-control": "no-store",
        "retry-after": "300",
        "x-robots-tag": "noindex, follow",
      },
    });

  const bike = catalog.find((entry) => entry.slug === slug);
  if (!bike || !BIKE_ID_RE.test(bike.bikeId))
    return new Response(null, {
      status: 404,
      headers: { "x-robots-tag": "noindex, follow" },
    });

  return new Response(null, {
    status: 301,
    headers: {
      location: `/radar/${encodeURIComponent(bike.bikeId)}${search}`,
      "cache-control": "public, max-age=3600",
    },
  });
}
