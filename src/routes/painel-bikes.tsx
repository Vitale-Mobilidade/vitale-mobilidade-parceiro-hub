import { createFileRoute } from "@tanstack/react-router";
import PainelBikes from "@/pages/PainelBikes";

export const Route = createFileRoute("/painel-bikes")({
  head: () => ({
    meta: [
      { title: "Painel do catálogo de bikes | Vitale Mobilidade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PainelBikes,
});
