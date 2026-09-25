import { createFileRoute, useNavigate } from "@tanstack/react-router";
import Acompanhamento from "@/pages/Acompanhamento";
import {
  loadRadarCatalog,
  radarCatalogHead,
  radarHeaders,
} from "@/lib/radar-routes";
import {
  getBikesDiscovery,
  type DiscoveryBike,
} from "@/lib/bikes-discovery.functions";
import { compareParam, parseCompare } from "@/lib/bike-compare";

// Rota-alvo do Radar: mesmo loader/página de /acompanhamento; /acompanhamento redireciona 301 para cá.
export const Route = createFileRoute("/radar/")({
  validateSearch: (search: Record<string, unknown>): { compare?: string } => {
    const compare = compareParam(parseCompare(search.compare));
    return compare ? { compare } : {};
  },
  loader: async () => {
    const [radar, discovery] = await Promise.all([
      loadRadarCatalog(),
      getBikesDiscovery().catch(() => ({
        ok: false,
        radarOk: false,
        videosOk: false,
        bikes: [] as DiscoveryBike[],
        videos: [],
      })),
    ]);
    return { ...radar, discovery };
  },
  headers: radarHeaders,
  head: () => radarCatalogHead("/radar"),
  component: RadarPage,
});

function RadarPage() {
  const initial = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/radar/" });
  const selectedIds = parseCompare(search.compare).filter((id) =>
    initial.discovery.bikes.some((bike) => bike.bikeId === id),
  );
  const setSelection = (ids: string[]) =>
    navigate({ search: { compare: compareParam(ids) }, resetScroll: false });

  return (
    <Acompanhamento
      initial={initial}
      comparisonBikes={initial.discovery.bikes}
      selectedCompareIds={selectedIds}
      onCompareChange={setSelection}
    />
  );
}
