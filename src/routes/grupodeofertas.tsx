import { createFileRoute } from "@tanstack/react-router";
import GrupoDeOfertas from "@/pages/GrupoDeOfertas";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/grupodeofertas")({
  component: GrupoDeOfertas,
  head: () =>
    pageHead({
      path: "/grupodeofertas",
      title: "Grupo de ofertas da Vitale Mobilidade no WhatsApp",
      description:
        "Entre no grupo de ofertas da Vitale Mobilidade no WhatsApp e acompanhe promoções de bikes elétricas selecionadas.",
      ogTitle: "Grupo de ofertas da Vitale Mobilidade",
      ogDescription:
        "Acompanhe ofertas e promoções de bikes elétricas selecionadas no grupo da Vitale no WhatsApp.",
      robots: "noindex, follow",
    }),
});
