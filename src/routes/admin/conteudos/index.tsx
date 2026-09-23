import { createFileRoute } from "@tanstack/react-router";
import { AdminArticlesPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/conteudos/")({
  head: () => ({ meta: [{ title: "Artigos · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminArticlesPage,
});
