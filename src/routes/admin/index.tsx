import { createFileRoute } from "@tanstack/react-router";
import { AdminOverviewPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/")({
  head: () => ({ meta: [{ title: "Admin | Vitale Mobilidade" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminOverviewPage,
});
