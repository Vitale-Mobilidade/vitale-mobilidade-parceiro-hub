import { createFileRoute } from "@tanstack/react-router";
import AdminCommunity from "@/pages/AdminCommunity";
export const Route = createFileRoute("/admin/comunidade")({
  head: () => ({
    meta: [
      { title: "Comunidade e anúncios · Admin Vitale" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCommunity,
});
