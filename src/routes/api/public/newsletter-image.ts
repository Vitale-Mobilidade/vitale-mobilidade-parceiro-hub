import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/newsletter-image")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { newsletterArticleImage } =
          await import("@/lib/newsletter-article-image.server");
        return newsletterArticleImage(
          new URL(request.url).searchParams.get("id") ?? "",
        );
      },
    },
  },
});
