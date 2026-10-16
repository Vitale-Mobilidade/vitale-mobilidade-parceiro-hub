import { createFileRoute } from "@tanstack/react-router";
import AdminRadar from "@/pages/AdminRadar";
export const Route = createFileRoute("/admin/radar")({
  head: () => ({
    meta: [
      { title: "Alertas do Radar | Admin Vitale" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminRadar,
});
