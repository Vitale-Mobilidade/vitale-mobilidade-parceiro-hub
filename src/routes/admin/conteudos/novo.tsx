import { createFileRoute } from "@tanstack/react-router";
import { AdminNewArticlePage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/conteudos/novo")({
  validateSearch: (search: Record<string, unknown>) => ({
    video: typeof search.video === "string" && /^[A-Za-z0-9_-]{11}$/.test(search.video) ? search.video : undefined,
  }),
  head: () => ({ meta: [{ title: "Criar artigo · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: NewArticleRoute,
});

function NewArticleRoute() {
  const { video } = Route.useSearch();
  return <AdminNewArticlePage initialVideoId={video} />;
}
