import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/podcast/capas/$file")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/lib/podcast-artwork.server")).servePodcastArtwork(request, params.file),
      HEAD: async ({ request, params }) =>
        (await import("@/lib/podcast-artwork.server")).servePodcastArtwork(request, params.file),
    },
  },
});
