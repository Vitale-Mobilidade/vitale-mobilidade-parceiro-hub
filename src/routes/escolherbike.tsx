import { createFileRoute } from "@tanstack/react-router";
import EscolherBike from "@/pages/EscolherBike";
import { getQuizCatalog } from "@/lib/quiz-catalog.functions";

export const Route = createFileRoute("/escolherbike")({
  // Bootstrap de leitura: só no SSR. Na navegação no cliente, o hook busca como antes.
  loader: () => (typeof window === "undefined" ? getQuizCatalog() : { ok: false as const }),
  component: EscolherBike,
});
