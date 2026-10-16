import { createFileRoute } from "@tanstack/react-router";
const handle = async ({ request }: { request: Request }) => {
  const { radarAlertsAdmin } = await import("@/lib/admin-radar.server");
  return radarAlertsAdmin(request);
};
export const Route = createFileRoute("/api/admin/radar-alerts")({
  server: { handlers: { GET: handle, POST: handle } },
});
