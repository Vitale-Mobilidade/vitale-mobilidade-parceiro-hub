import { createFileRoute } from "@tanstack/react-router";
import { MobilityToolPage } from "@/components/mobility/MobilityToolPage";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import type { MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { toolHead } from "@/lib/mobility/tools-registry";

export const Route = createFileRoute("/ferramentas/moto-vs-bike")({
  loader: () => getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => toolHead("moto-vs-bike"),
  component: ToolRoute,
});

function ToolRoute() {
  return <MobilityToolPage slug="moto-vs-bike" data={Route.useLoaderData()} />;
}
