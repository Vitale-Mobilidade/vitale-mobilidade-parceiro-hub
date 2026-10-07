import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/newsletter-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { resendNewsletterWebhook } =
          await import("@/lib/newsletter-webhook.server");
        return resendNewsletterWebhook(request);
      },
      GET: () => new Response(null, { status: 405 }),
    },
  },
});
