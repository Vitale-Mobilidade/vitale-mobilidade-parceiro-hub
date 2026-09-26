import { createFileRoute } from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import EscolherBike from "@/pages/EscolherBike";
import { getQuizCatalog } from "@/lib/quiz-catalog.functions";
import { pageHead } from "@/lib/seo";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";

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
      image: {
        url: "https://vitalemobilidade.com/og/vitale-quiz-1200x630.jpg",
        width: 1200,
        height: 630,
        type: "image/jpeg",
        alt: "Quiz Vitale para escolher bicicleta elétrica",
      },
    }),
  component: QuizPage,
});

function QuizPage() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <EscolherBike />
        <SiteFooter />
      </div>
    </QueryClientProvider>
  );
}
