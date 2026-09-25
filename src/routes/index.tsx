import { createFileRoute } from "@tanstack/react-router";
import HomeB2C from "@/pages/HomeB2C";
import { pageHead } from "@/lib/seo";
import { getHomeCards } from "@/lib/home-cards.functions";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";

// Etapa 5 (rascunho): Home B2C. A Home legada de consultoria segue em src/pages/Index.tsx.
export const Route = createFileRoute("/")({
  // Leitura read-only: servidor devolve só os cards prontos; falha apenas omite os cards.
  loader: async () => {
    const [cards, catalog, articles] = await Promise.all([
      getHomeCards().catch(() => ({ ok: false as const })),
      getBikeCatalog().catch(() => ({ ok: false, bikes: [] })),
      getPublishedArticles().catch(() => null),
    ]);
    // bikeId -> slug editorial, só para modelos existentes no catálogo.
    const bikeSlugs: Record<string, string> = Object.fromEntries(catalog.bikes.map((b) => [b.bikeId, b.slug]));
    return { ...cards, bikeSlugs, articles: articles ?? [] };
  },
  head: () =>
    pageHead({
      path: "/",
      title: "Encontre a bike elétrica certa para você | Vitale Mobilidade",
      description:
        "Testamos bikes, comparamos modelos, acompanhamos preços e criamos ferramentas para ajudar você a escolher sua bike elétrica.",
      ogTitle: "Encontre a bike elétrica certa para você",
      ogDescription:
        "Quiz de perfil, Radar com histórico de preços e bikes elétricas monitoradas no Brasil.",
    }),
  component: HomeB2C,
});
