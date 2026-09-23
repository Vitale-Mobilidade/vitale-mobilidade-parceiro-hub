import { createFileRoute } from "@tanstack/react-router";
import { AdminLogsPage } from "@/pages/AdminEditorial";
export const Route = createFileRoute("/admin/logs")({
  head: () => ({ meta: [{ title: "Logs · Admin Vitale" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminLogsPage,
});
