import { createFileRoute } from "@tanstack/react-router";
import { AdminNewArticlePage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/conteudos/novo")({
  head: () => ({ meta: [{ title: "Criar artigo · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminNewArticlePage,
});
