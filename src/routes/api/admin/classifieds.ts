import { createFileRoute } from "@tanstack/react-router";
const handle = async ({ request }: { request: Request }) => {
  const { adminClassifieds } = await import("@/lib/admin-classifieds.server");
  return adminClassifieds(request);
};
export const Route = createFileRoute("/api/admin/classifieds")({
  server: { handlers: { POST: handle } },
});
