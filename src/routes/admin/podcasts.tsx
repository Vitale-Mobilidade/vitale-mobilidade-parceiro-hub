import { createFileRoute } from "@tanstack/react-router";
import AdminPodcasts from "@/pages/AdminPodcasts";

export const Route = createFileRoute("/admin/podcasts")({
  head: () => ({ meta: [{ title: "Podcasts · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminPodcasts,
});
