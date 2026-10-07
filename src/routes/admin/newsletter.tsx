import { createFileRoute } from "@tanstack/react-router";
import AdminNewsletter from "@/pages/AdminNewsletter";
export const Route = createFileRoute("/admin/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter · Admin Vitale" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminNewsletter,
});
