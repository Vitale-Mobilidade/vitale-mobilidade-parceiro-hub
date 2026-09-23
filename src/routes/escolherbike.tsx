import { createFileRoute } from "@tanstack/react-router";
import EscolherBike from "@/pages/EscolherBike";
import { getQuizCatalog } from "@/lib/quiz-catalog.functions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/escolherbike")({
  // Bootstrap de leitura: só no SSR. Na navegação no cliente, o hook busca como antes.
  loader: () => (typeof window === "undefined" ? getQuizCatalog() : { ok: false as const }),
  head: () =>
    pageHead({
      path: "/escolherbike",
      title: "Quiz: descubra sua bike elétrica ideal | Vitale Mobilidade",
      description:
        "Responda 7 perguntas e receba a recomendação de bike elétrica ideal para seu uso, trajeto e orçamento. Curadoria da Vitale Mobilidade.",
      ogTitle: "Quiz: descubra sua bike elétrica ideal",
      ogDescription:
        "Quiz rápido para encontrar a bike elétrica certa para você, com curadoria da Vitale Mobilidade.",
    }),
  component: EscolherBike,
});
