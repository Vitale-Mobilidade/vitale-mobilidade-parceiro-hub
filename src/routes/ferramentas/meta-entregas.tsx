import { createFileRoute } from "@tanstack/react-router";
import { MobilityToolPage } from "@/components/mobility/MobilityToolPage";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import type { MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { toolHead } from "@/lib/mobility/tools-registry";

export const Route = createFileRoute("/ferramentas/meta-entregas")({
  loader: () => getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => toolHead("meta-entregas"),
  component: ToolRoute,
});

function ToolRoute() {
  return <MobilityToolPage slug="meta-entregas" data={Route.useLoaderData()} />;
}
