import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/newsletter-worker")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { newsletterTick } =
          await import("@/lib/newsletter-service.server");
        return newsletterTick(request);
      },
      GET: () => new Response(null, { status: 405 }),
    },
  },
});
