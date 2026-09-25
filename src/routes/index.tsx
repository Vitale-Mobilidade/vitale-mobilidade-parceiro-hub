import { createFileRoute } from "@tanstack/react-router";
import HomeB2C from "@/pages/HomeB2C";
import { pageHead } from "@/lib/seo";
import { getHomeCards } from "@/lib/home-cards.functions";
import { safeVideos } from "@/lib/videos.functions";

// Home B2C canônica; a antiga landing de consultoria foi aposentada em 25/09/2026.
export const Route = createFileRoute("/")({
  // Leitura read-only: servidor devolve só os cards prontos; falha apenas omite os cards.
  loader: async () => {
    const [cards, videos] = await Promise.all([
      getHomeCards().catch(() => ({ ok: false as const })),
      safeVideos({ limit: 4 }),
    ]);
    return { ...cards, videos };
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
