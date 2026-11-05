import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-ui";
import { GoogleMemberCallback } from "@/components/members/GoogleMemberCallback";
export const Route = createFileRoute("/conta_/google")({
  headers: () => ({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  }),
  head: () => ({
    meta: [
      { title: "Acesso com Google | Vitale Mobilidade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12" data-heatmap-private>
        <GoogleMemberCallback />
      </main>
    </div>
  ),
});
