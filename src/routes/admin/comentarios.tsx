import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/AdminShell";
import { CommentModeration } from "@/components/members/CommentModeration";
import { memberAccountsEnabled } from "@/lib/member-accounts-feature";

export const Route = createFileRoute("/admin/comentarios")({
  head: () => ({
    meta: [
      { title: "Comentários | Admin Vitale" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  headers: () => ({ "Cache-Control": "private, no-store" }),
  component: () => (
    <AdminShell>
      {(role) =>
        role === "admin" && memberAccountsEnabled ? (
          <CommentModeration />
        ) : (
          <p>Moderação indisponível para este acesso.</p>
        )
      }
    </AdminShell>
  ),
});
