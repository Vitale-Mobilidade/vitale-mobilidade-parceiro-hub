import { createFileRoute } from "@tanstack/react-router";
import Index from "@/pages/Index";
import { pageHead } from "@/lib/seo";

// Metadata provisória fiel à Home atual (consultoria); será revista na Etapa 5.
export const Route = createFileRoute("/")({
  head: () =>
    pageHead({
      path: "/",
      title: "Vitale Mobilidade | Consultoria em Veículos Elétricos",
      description:
        "Consultoria estratégica em veículos elétricos: escolha fornecedores confiáveis, estruture operações B2B/B2C e cresça com segurança no Brasil.",
      ogDescription:
        "Consultoria estratégica em veículos elétricos. Fornecedores confiáveis, operações B2B/B2C e crescimento seguro.",
    }),
  component: Index,
});
