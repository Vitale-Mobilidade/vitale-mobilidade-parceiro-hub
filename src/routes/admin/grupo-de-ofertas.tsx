import { createFileRoute } from "@tanstack/react-router";
import AdminOffersGroup from "@/pages/AdminOffersGroup";
export const Route = createFileRoute("/admin/grupo-de-ofertas")({
  head: () => ({
    meta: [
      { title: "Grupo de ofertas | Admin Vitale" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminOffersGroup,
});
