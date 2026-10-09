import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { VideoCards } from "@/components/site/VideoCards";
import { safeVideos } from "@/lib/videos.functions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/videos")({
  loader: () => safeVideos({ limit: null }),
  head: ({ loaderData }) => pageHead({
    path: "/videos",
    title: "Vídeos de bikes elétricas | Vitale Mobilidade",
    description: "Assista aos vídeos da Vitale sobre bikes elétricas, do mais recente ao mais antigo.",
    robots: loaderData?.length ? undefined : "noindex, follow",
  }),
  component: VideosPage,
});

function VideosPage() {
  const videos = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main className="responsive-container py-12 sm:py-16">
        <Link to="/" className="inline-flex min-h-11 items-center text-sm font-semibold text-action hover:underline">Voltar à página inicial</Link>
        <h1 className="mt-4 text-4xl font-extrabold text-ink">Todos os vídeos</h1>
        <p className="mt-3 text-muted-foreground">Vídeos da Vitale, do mais recente ao mais antigo.</p>
        {videos.length ? <VideoCards videos={videos} className="mt-8" /> : <p className="mt-8 rounded-xl bg-surface p-6 text-muted-foreground">Nenhum vídeo disponível no momento. Tente novamente mais tarde.</p>}
      </main>
      <SiteFooter />
    </div>
  );
}
