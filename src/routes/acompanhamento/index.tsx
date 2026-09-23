import { createFileRoute } from "@tanstack/react-router";
import Acompanhamento from "@/pages/Acompanhamento";
import { getRadarCatalog } from "@/lib/radar.functions";

export const Route = createFileRoute("/acompanhamento/")({
  loader: () => getRadarCatalog(),
  component: Acompanhamento,
});
