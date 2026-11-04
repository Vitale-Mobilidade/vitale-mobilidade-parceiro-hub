import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { asaasListingWebhook } =
          await import("@/lib/listing-billing.server");
        return asaasListingWebhook(request);
      },
      GET: () => new Response(null, { status: 405 }),
    },
  },
});
