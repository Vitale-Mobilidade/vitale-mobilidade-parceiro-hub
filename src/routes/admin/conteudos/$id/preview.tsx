import { createFileRoute } from "@tanstack/react-router";
import { AdminArticlePreviewPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/conteudos/$id/preview")({
  head: () => ({ meta: [{ title: "Preview privado · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: () => <AdminArticlePreviewPage id={Route.useParams().id} />,
});
