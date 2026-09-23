import type { ReactNode } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { SiteHeader, SiteFooter, BikeMedia } from "@/components/site/site-ui";
import { VideoCards } from "@/components/site/VideoCards";
import { getCatalogBike } from "@/lib/editorial-bikes.functions";
import { safeVideos } from "@/lib/videos.functions";
import { formatBRL } from "@/lib/price-tracker";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/bikes/$slug")({
  loader: async ({ params }) => {
    const r = await getCatalogBike({ data: { slug: params.slug } });
    if (!r.ok) throw new Error("catálogo indisponível");
    if (!r.bike) throw notFound();
    const videos = await safeVideos({ bikeId: r.bike.bikeId, limit: 8 });
    return { bike: r.bike, videos };
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return { meta: [{ title: "Bike indisponível | Vitale Mobilidade" }, { name: "robots", content: "noindex" }] };
    }
    const b = loaderData.bike;
    const facts = [b.autonomy && `autonomia ${b.autonomy.toLowerCase()}`, b.capacity && `capacidade ${b.capacity}`].filter(Boolean).join(", ");
    const head = pageHead({
      path: `/bikes/${params.slug}`,
      title: `${b.name}: bike elétrica | Vitale Mobilidade`,
      description: `${b.name}${facts ? `: ${facts}` : ""}. Descrição e vídeos reais do modelo.`,
      ogType: "product",
    });
    if (b.image) {
      head.meta.push({ property: "og:image", content: b.image }, { name: "twitter:image", content: b.image });
    }
    return head;
  },
  notFoundComponent: BikeNotFound,
  errorComponent: BikeUnavailable,
  component: BikeDetail,
});

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="responsive-container py-8 md:py-12">
        <Link to="/bikes" className="inline-flex items-center gap-2 text-sm font-semibold text-action hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Todas as bikes
        </Link>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}

function BikeNotFound() {
  return <Shell><p className="mt-8 rounded-xl bg-surface p-6 text-sm text-muted-foreground">Não encontramos este modelo.</p></Shell>;
}

function BikeUnavailable() {
  return <Shell><p className="mt-8 rounded-xl bg-surface p-6 text-sm text-muted-foreground">Não foi possível carregar este modelo agora. Tente novamente em instantes.</p></Shell>;
}

function BikeDetail() {
  const { bike, videos } = Route.useLoaderData();
  const paragraphs = (bike.description ?? "").split(/\n+/).map((p) => p.trim()).filter(Boolean);
  return (
    <Shell>
      <article className="mt-6 grid gap-8 lg:grid-cols-2">
        <BikeMedia src={bike.image} name={bike.name} eager className="aspect-[4/3] w-full rounded-2xl ring-1 ring-line" />
        <div>
          {bike.category && <p className="text-sm font-semibold uppercase tracking-wide text-action">{bike.category}</p>}
          <h1 className="mt-1 text-3xl font-black tracking-tight text-ink md:text-5xl">{bike.name}</h1>
          <dl className="mt-5 grid grid-cols-2 gap-3">
            {bike.autonomy && <Fact label="Autonomia" value={bike.autonomy} />}
            {bike.capacity && <Fact label="Capacidade" value={bike.capacity} />}
          </dl>
          <div className="mt-6 rounded-2xl bg-surface p-5 ring-1 ring-line">
            {bike.sheetPrice != null && (
              <p className="text-sm text-muted-foreground">
                Preço de referência cadastrado: <strong className="text-lg text-ink">{formatBRL(bike.sheetPrice)}</strong>
              </p>
            )}
            {bike.link ? (
              <>
                <a href={bike.link} target="_blank" rel="noopener noreferrer sponsored" className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-action px-5 font-bold text-action-foreground hover:opacity-90 sm:w-auto">
                  Ver no Mercado Livre <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
                <p className="mt-2 text-xs text-muted-foreground">Preço e disponibilidade devem ser confirmados no Mercado Livre.</p>
              </>
            ) : (
              <p className="mt-2 font-semibold text-ink">Link indisponível no momento</p>
            )}
          </div>
        </div>
      </article>
      {paragraphs.length > 0 && (
        <section aria-labelledby="sobre" className="mt-10 max-w-3xl">
          <h2 id="sobre" className="text-2xl font-black text-ink">Sobre o modelo</h2>
          <div className="mt-3 space-y-3 text-ink/85">{paragraphs.map((p, i) => <p key={i}>{p}</p>)}</div>
        </section>
      )}
      {videos.length > 0 && (
        <section aria-labelledby="videos" className="mt-10">
          <h2 id="videos" className="text-2xl font-black text-ink">Vídeos do {bike.name}</h2>
          <VideoCards videos={videos} className="mt-4" />
        </section>
      )}
    </Shell>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3 ring-1 ring-line">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-bold text-ink">{value}</dd>
    </div>
  );
}
