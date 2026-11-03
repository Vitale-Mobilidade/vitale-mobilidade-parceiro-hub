import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { getPublicBikeListings } from "@/lib/bike-classifieds.functions";
import { ListingPreview } from "@/components/classifieds/ListingPreview";
import { pageHead } from "@/lib/seo";
export const Route = createFileRoute("/venda-sua-bike_/$id")({
  loader: async ({ params }) => {
    if (!z.string().uuid().safeParse(params.id).success) throw notFound();
    const result = await getPublicBikeListings({
      data: { id: params.id, limit: 1, offset: 0 },
    });
    if (!result.ok) return { listing: null, unavailable: true };
    if (!result.items[0]) throw notFound();
    return { listing: result.items[0], unavailable: false };
  },
  headers: () => ({ "Cache-Control": "no-store" }),
  head: ({ loaderData, params }) =>
    pageHead({
      path: `/venda-sua-bike/${params.id}`,
      title: loaderData?.listing
        ? `${loaderData.listing.title} | Venda sua bike | Vitale Mobilidade`
        : "Anúncio | Vitale Mobilidade",
      description:
        loaderData?.listing?.description.slice(0, 160) ??
        "Bike anunciada pela comunidade Vitale.",
      robots: "noindex, follow",
    }),
  component: function BikeListingPage() {
    const { listing } = Route.useLoaderData();
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="responsive-container py-10">
          <a
            href="/venda-sua-bike"
            className="mb-7 inline-flex min-h-11 items-center font-semibold text-action underline"
          >
            ← Todas as bikes
          </a>
          {listing ? (
            <ListingPreview listing={listing} />
          ) : (
            <p role="alert">
              Não foi possível carregar este anúncio. Tente novamente em alguns
              instantes.
            </p>
          )}
        </main>
        <SiteFooter />
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="responsive-container py-16">
        <h1 className="text-3xl font-bold">Anúncio indisponível</h1>
        <p className="mt-4">
          A bike pode ter sido vendida ou o anúncio foi retirado do ar.
        </p>
        <a
          href="/venda-sua-bike"
          className="mt-6 inline-flex min-h-11 items-center text-action underline"
        >
          Ver bikes disponíveis
        </a>
      </main>
    </div>
  ),
});
