import { createFileRoute } from "@tanstack/react-router";
import AcompanhamentoBike from "@/pages/AcompanhamentoBike";
import { loadRadarBike, radarBikeHead, radarHeaders, RadarBikeNotFound } from "@/lib/radar-routes";

// Rota-alvo do detalhe: mesmo loader/página de /acompanhamento/$bikeId.
export const Route = createFileRoute("/radar/$bikeId")({
  loader: ({ params }) => loadRadarBike(params.bikeId),
  headers: radarHeaders,
  head: ({ params, loaderData }) => radarBikeHead("/radar", params.bikeId, loaderData),
  component: RadarBikePage,
  notFoundComponent: RadarBikeNotFoundPage,
});

function RadarBikePage() {
  return <AcompanhamentoBike initial={Route.useLoaderData()} />;
}

function RadarBikeNotFoundPage() {
  return <RadarBikeNotFound base="/radar" />;
}
