import { createFileRoute } from "@tanstack/react-router";
import AcompanhamentoBike from "@/pages/AcompanhamentoBike";
import { loadRadarBike, radarBikeHead, radarHeaders, RadarBikeNotFound } from "@/lib/radar-routes";

export const Route = createFileRoute("/acompanhamento/$bikeId")({
  loader: ({ params }) => loadRadarBike(params.bikeId),
  headers: radarHeaders,
  head: ({ params, loaderData }) => radarBikeHead("/acompanhamento", params.bikeId, loaderData),
  component: LegacyRadarBikePage,
  notFoundComponent: LegacyRadarBikeNotFound,
});

function LegacyRadarBikePage() {
  return <AcompanhamentoBike initial={Route.useLoaderData()} />;
}

function LegacyRadarBikeNotFound() {
  return <RadarBikeNotFound base="/acompanhamento" />;
}
