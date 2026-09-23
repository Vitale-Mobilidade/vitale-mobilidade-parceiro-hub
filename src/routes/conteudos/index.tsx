import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/conteudos/")({
  loader: async () => {
    const items = await getPublishedArticles();
    if (!items) throw new Error("conteudos_unavailable");
    return items;
  },
  head: () => pageHead({ path: "/conteudos", title: "Conteúdos e testes de bikes elétricas | Vitale Mobilidade",
    description: "Testes reais, guias e comparativos da Vitale para ajudar você a escolher sua bike elétrica." }),
  component: ContentIndex,
});

function ContentIndex() {
  const items = Route.useLoaderData();
  return <div className="min-h-screen bg-background"><SiteHeader />
    <main className="responsive-container py-12"><p className="text-sm font-bold uppercase tracking-widest text-emerald-700">Conteúdo Vitale</p>
      <h1 className="mt-2 text-4xl font-bold">Testes, comparativos e guias</h1>
      <p className="mt-4 max-w-2xl text-lg text-muted-foreground">Conteúdo produzido a partir dos vídeos e testes reais da Vitale.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{items.map(item => <Link key={item.slug} to="/conteudos/$slug" params={{ slug: item.slug }}
        className="overflow-hidden rounded-xl border border-line bg-white hover:shadow-md">
        {item.ogImageUrl && <img src={item.ogImageUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
        <div className="p-5"><h2 className="text-xl font-bold">{item.title}</h2><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p>
          <span className="mt-4 inline-block text-sm font-semibold text-emerald-800">Ler conteúdo →</span></div>
      </Link>)}</div>
      {items.length === 0 && <p className="mt-8 rounded-xl bg-surface p-6">Ainda não há conteúdos editoriais publicados.</p>}
    </main><SiteFooter /></div>;
}
