import { createFileRoute } from "@tanstack/react-router";
import { AdminBikesPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/bikes")({
  head: () => ({ meta: [{ title: "Bikes · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminBikesPage,
});
