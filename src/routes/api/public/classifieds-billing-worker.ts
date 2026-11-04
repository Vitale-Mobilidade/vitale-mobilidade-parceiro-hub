import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/classifieds-billing-worker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { listingBillingWorker } =
          await import("@/lib/listing-billing.server");
        return listingBillingWorker(request);
      },
      GET: () => new Response(null, { status: 405 }),
    },
  },
});
