import { createFileRoute } from "@tanstack/react-router";
import AdminNewsletter from "@/pages/AdminNewsletter";
export const Route = createFileRoute("/admin/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter · Admin Vitale" },
      {
        name: "description",
        content:
          "Operação e prévias editoriais da newsletter O Giro da Vitale.",
      },
      { property: "og:title", content: "Newsletter · Admin Vitale" },
      {
        property: "og:description",
        content:
          "Operação e prévias editoriais da newsletter O Giro da Vitale.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNewsletter,
});
