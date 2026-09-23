import { createFileRoute } from "@tanstack/react-router";
import { AdminArticleEditorPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/conteudos/$id")({
  head: () => ({ meta: [{ title: "Editor · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <AdminArticleEditorPage id={Route.useParams().id} />,
});
