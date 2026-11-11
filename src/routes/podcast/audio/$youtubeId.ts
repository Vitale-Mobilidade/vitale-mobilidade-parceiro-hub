import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/podcast/audio/$youtubeId")({
  server: {
    handlers: {
      GET: async ({ request, params }) =>
        (await import("@/lib/podcast-delivery.server")).servePodcastAudio(request, params.youtubeId),
      HEAD: async ({ request, params }) =>
        (await import("@/lib/podcast-delivery.server")).servePodcastAudio(request, params.youtubeId),
    },
  },
});
