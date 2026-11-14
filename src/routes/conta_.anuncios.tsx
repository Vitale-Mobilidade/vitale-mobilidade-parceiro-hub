import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-ui";
import { MemberListings } from "@/components/classifieds/MemberListings";
import { classifiedsResumeId } from "@/lib/member-community";
export const Route = createFileRoute("/conta_/anuncios")({
  validateSearch: (search: Record<string, unknown>) => ({
    anuncio: classifiedsResumeId(search.anuncio),
    novo: String(search.novo) === "1" ? 1 : undefined,
  }),
  headers: () => ({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  }),
  head: () => ({
    meta: [
      { title: "Meus anúncios | Vitale Mobilidade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: function ListingsPage() {
    const { novo, anuncio } = Route.useSearch();
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <main className="responsive-container py-10" data-heatmap-private>
          <MemberListings
            startNew={!anuncio && novo === 1}
            resumeId={anuncio}
          />
        </main>
      </div>
    );
  },
});
