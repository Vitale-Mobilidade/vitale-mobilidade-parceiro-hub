import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/podcast/rss.xml")({
  server: {
    handlers: {
      GET: async () => (await import("@/lib/podcast-delivery.server")).servePodcastFeed(false),
      HEAD: async () => (await import("@/lib/podcast-delivery.server")).servePodcastFeed(true),
    },
  },
});
