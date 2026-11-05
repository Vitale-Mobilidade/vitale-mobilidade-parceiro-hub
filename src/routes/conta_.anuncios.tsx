import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-ui";
import { MemberListings } from "@/components/classifieds/MemberListings";
export const Route = createFileRoute("/conta_/anuncios")({
  validateSearch: (search: Record<string, unknown>) => ({
    novo: String(search.novo) === "1" ? "1" : undefined,
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
    const { novo } = Route.useSearch();
    return (
      <div className="min-h-screen bg-surface">
        <SiteHeader />
        <main className="responsive-container py-10" data-heatmap-private>
          <MemberListings startNew={novo === "1"} />
        </main>
      </div>
    );
  },
});
