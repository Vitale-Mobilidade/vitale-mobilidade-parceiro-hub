import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/member/listing-billing")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { memberListingBilling } =
          await import("@/lib/listing-billing.server");
        return memberListingBilling(request);
      },
      GET: () => new Response(null, { status: 405 }),
    },
  },
});
