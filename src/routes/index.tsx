import { createFileRoute } from "@tanstack/react-router";
import HomeB2C from "@/pages/HomeB2C";
import { pageHead } from "@/lib/seo";
import { getHomeCards } from "@/lib/home-cards.functions";

// Etapa 5 (rascunho): Home B2C. A Home legada de consultoria segue em src/pages/Index.tsx.
export const Route = createFileRoute("/")({
  // Leitura read-only: servidor devolve só os cards prontos; falha apenas omite os cards.
  loader: async () => {
    try {
      return await getHomeCards();
    } catch {
      return { ok: false as const };
    }
  },
  head: () =>
    pageHead({
      path: "/",
      title: "Vitale Mobilidade | Escolha sua bike elétrica e acompanhe preços",
      description:
        "Descubra a bike elétrica ideal para o seu perfil com o quiz da Vitale e consulte o histórico de preços antes de decidir a compra.",
      ogTitle: "Escolha sua bike elétrica com clareza",
      ogDescription:
        "Quiz para descobrir a bike ideal e histórico de preços para decidir a compra com segurança.",
    }),
  component: HomeB2C,
});
