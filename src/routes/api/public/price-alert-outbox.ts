import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/price-alert-outbox")({
  server: { handlers: {
    POST: async ({ request }) => {
      const { deliverPriceAlertOutbox } = await import("@/lib/hotpipe-outbox.server");
      return deliverPriceAlertOutbox(request);
    },
    GET: () => new Response(null, { status: 405 }),
  } },
});
