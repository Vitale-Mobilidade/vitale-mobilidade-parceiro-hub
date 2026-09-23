import { createFileRoute } from "@tanstack/react-router";
import { AdminVideosPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/videos")({
  head: () => ({ meta: [{ title: "Vídeos · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminVideosPage,
});
