import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { BikeCatalogCard } from "@/components/site/BikeCatalogCard";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/bikes/")({
  loader: () => getBikeCatalog().catch(() => ({ ok: false, bikes: [] })),
  head: () =>
    pageHead({
      path: "/bikes",
      title: "Bikes elétricas: todos os modelos | Vitale Mobilidade",
      description:
        "Catálogo de bikes elétricas acompanhadas pela Vitale Mobilidade, com autonomia, capacidade, descrição e vídeos reais de cada modelo.",
      ogTitle: "Todos os modelos de bikes elétricas",
      ogDescription: "Autonomia, capacidade, descrição e vídeos reais de cada modelo.",
    }),
  component: BikesIndex,
});

function BikesIndex() {
  const { ok, bikes } = Route.useLoaderData();
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="responsive-container py-8 md:py-12">
        <h1 className="text-3xl font-black tracking-tight text-ink md:text-5xl">Bikes elétricas</h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {ok ? `${bikes.length} modelos com dados da nossa planilha oficial.` : "O catálogo está indisponível no momento. Tente novamente em instantes."}
        </p>
        {ok && (
          <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-5">
            {bikes.map((b) => (
              <li key={b.bikeId}><BikeCatalogCard bike={b} /></li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
