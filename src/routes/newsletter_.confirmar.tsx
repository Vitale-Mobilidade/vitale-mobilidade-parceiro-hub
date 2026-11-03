import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site/site-ui";
import { NewsletterConfirmation } from "@/components/members/NewsletterConfirmation";
import { newsletterReferralsEnabled } from "@/lib/newsletter-referrals";

export const Route = createFileRoute("/newsletter_/confirmar")({
  headers: () => ({
    "Cache-Control": "private, no-store",
    "Referrer-Policy": "no-referrer",
  }),
  head: () => ({
    meta: [
      { title: "Confirmar newsletter | Vitale Mobilidade" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-surface">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-12">
        {newsletterReferralsEnabled ? (
          <NewsletterConfirmation />
        ) : (
          <p>
            A confirmação por convite está temporariamente indisponível.{" "}
            <a href="/newsletter" className="underline">
              Voltar à newsletter
            </a>
          </p>
        )}
      </main>
    </div>
  ),
});
