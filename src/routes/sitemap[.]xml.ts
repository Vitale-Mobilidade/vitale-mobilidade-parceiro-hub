import { createFileRoute } from "@tanstack/react-router";
import { buildSitemapXml, bikeSlugPaths, radarIdPaths, STATIC_SITEMAP_PATHS } from "@/lib/sitemap";

async function build(): Promise<string | null> {
  const [{ fetchBikeCatalogFromDb }, { fetchTrackerSplit }] = await Promise.all([
    import("@/lib/bikes-repository.server"),
    import("@/lib/radar-repository.server"),
  ]);
  const [catalog, radar] = await Promise.all([fetchBikeCatalogFromDb(), fetchTrackerSplit()]);
  // Sem dado confiável de qualquer fonte → sem sitemap parcial.
  if (!catalog || catalog.length === 0 || !radar.ok) return null;
  return buildSitemapXml([
    ...STATIC_SITEMAP_PATHS,
    ...bikeSlugPaths(catalog),
    ...radarIdPaths([...radar.data.active, ...radar.data.archived]),
  ]);
}

async function respond(head: boolean): Promise<Response> {
  const xml = await build();
  if (!xml) {
    return new Response(head ? null : "Sitemap temporariamente indisponível", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "Retry-After": "300" },
    });
  }
  return new Response(head ? null : xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600",
    },
  });
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => respond(false),
      HEAD: () => respond(true),
    },
  },
});
