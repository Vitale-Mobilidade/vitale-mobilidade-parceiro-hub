import { createFileRoute } from "@tanstack/react-router";
import AcompanhamentoBike from "@/pages/AcompanhamentoBike";
import { getRadarBike } from "@/lib/radar.functions";

export const Route = createFileRoute("/acompanhamento/$bikeId")({
  loader: ({ params }) => getRadarBike({ data: { bikeId: params.bikeId } }),
  component: AcompanhamentoBike,
});
