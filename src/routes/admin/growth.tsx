import { createFileRoute } from "@tanstack/react-router";
import { AdminGrowthPage } from "@/pages/AdminEditorial";

export const Route = createFileRoute("/admin/growth")({
  head: () => ({ meta: [{ title: "Growth · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminGrowthPage,
});
