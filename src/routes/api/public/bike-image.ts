import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/bike-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { publicBikeImage } =
          await import("@/lib/bike-classifieds-media.server");
        return publicBikeImage(
          new URL(request.url).searchParams.get("id") ?? "",
        );
      },
    },
  },
});
