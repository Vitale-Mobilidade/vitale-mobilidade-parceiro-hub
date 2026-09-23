import { createFileRoute } from "@tanstack/react-router";
import AcompanhamentoBike from "@/pages/AcompanhamentoBike";

export const Route = createFileRoute("/acompanhamento/$bikeId")({ component: AcompanhamentoBike });
