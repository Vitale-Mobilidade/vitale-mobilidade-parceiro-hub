import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-ui";
import { MemberListings } from "@/components/classifieds/MemberListings";
export const Route = createFileRoute("/conta_/anuncios")({
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
  component: () => (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="responsive-container py-10" data-heatmap-private>
        <MemberListings />
      </main>
    </div>
  ),
});
