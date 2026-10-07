import { createFileRoute } from "@tanstack/react-router";
const handle = async ({ request }: { request: Request }) => {
  const { newsletterAdmin } = await import("@/lib/newsletter-service.server");
  return newsletterAdmin(request);
};
export const Route = createFileRoute("/api/admin/newsletter")({
  server: { handlers: { GET: handle, POST: handle } },
});
