import { createFileRoute } from "@tanstack/react-router";
import { MobilityToolPage } from "@/components/mobility/MobilityToolPage";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import type { MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { toolHead } from "@/lib/mobility/tools-registry";

export const Route = createFileRoute("/ferramentas/veiculo-alugado-vs-bike-propria")({
  loader: () => getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => toolHead("veiculo-alugado-vs-bike-propria"),
  component: ToolRoute,
});

function ToolRoute() {
  return <MobilityToolPage slug="veiculo-alugado-vs-bike-propria" data={Route.useLoaderData()} />;
}
