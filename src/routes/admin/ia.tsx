import { createFileRoute } from "@tanstack/react-router";
import { AdminAiPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/ia")({
  head: () => ({ meta: [{ title: "IA · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminAiPage,
});
