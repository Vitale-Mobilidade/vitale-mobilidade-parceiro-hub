import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const eventSchema = z.object({
  id: z.string().uuid(),
  lease_token: z.string().uuid(),
  delivery_from: z.string().min(3).max(320),
  delivery_to: z.string().email(),
  event_kind: z.enum(["registration", "paid_listing"]),
  payload: z.object({
    name: z.string().min(2).max(60),
    occurredAt: z.string().datetime({ offset: true }),
    listingId: z.string().uuid().optional(),
    title: z.string().min(1).max(100).optional(),
    amountCents: z.literal(15000).optional(),
    paidUntil: z.string().datetime({ offset: true }).optional(),
  }),
});
type Alert = z.infer<typeof eventSchema>;
const escape = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c]!,
  );
const date = (value: string) =>
  new Date(value).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });

/** Immutable queue snapshot: retries use exactly the same recipient, sender and body. */
export function operationAlertMessage(alert: Alert) {
  const p = alert.payload;
  const paid = alert.event_kind === "paid_listing";
  if (
    paid &&
    (!p.listingId || !p.title || p.amountCents !== 15000 || !p.paidUntil)
  )
    throw new Error("invalid_payload");
  const subject = paid
    ? "Vitale: pagamento confirmado e anúncio publicado"
    : "Vitale: novo cadastro na comunidade";
  const detail = paid
    ? [
        `Anunciante: ${p.name}`,
        `Bike: ${p.title}`,
        "Pagamento confirmado: R$150,00 · pagamento único",
        `Exibição até: ${date(p.paidUntil!)}`,
      ]
    : [`Nome público: ${p.name}`, "Cadastro concluído na comunidade Vitale."];
  const url = paid
    ? `https://vitalemobilidade.com/venda-sua-bike/${p.listingId}`
    : "https://vitalemobilidade.com/admin/comunidade";
  const action = paid ? "Ver anúncio" : "Acompanhar cadastros";
  const lines = [...detail, `Data: ${date(p.occurredAt)} (São Paulo)`];
  return {
    from: alert.delivery_from,
    to: [alert.delivery_to],
    subject,
    text: `${subject}\n\n${lines.join("\n")}\n\n${action}: ${url}\nPainel: https://vitalemobilidade.com/admin/comunidade`,
    html: `<div style="font-family:Arial,sans-serif;color:#143d32;max-width:600px;margin:auto;padding:28px"><p style="font-weight:bold">VITALE MOBILIDADE</p><h1 style="font-size:24px">${escape(subject)}</h1>${lines.map((line) => `<p style="line-height:1.6">${escape(line)}</p>`).join("")}<p style="margin-top:28px"><a href="${url}" style="display:inline-block;background:#087b57;color:white;padding:14px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${action}</a></p><p style="font-size:12px;color:#687a73">Aviso administrativo da Vitale Mobilidade.</p></div>`,
  };
}

/** Called only after the existing signed worker authenticates. Never blocks billing on mail failure. */
export async function deliverMemberOperationAlerts(
  db: SupabaseClient,
  request: typeof fetch = fetch,
) {
  const key = process.env.RESEND_API_KEY;
  const gateway = process.env.LOVABLE_API_KEY;
  if (!key) return { accepted: 0, configured: false };
  let accepted = 0;
  try {
    const claimed = await db.rpc("member_operation_alert_claim");
    if (claimed.error) throw new Error("queue_unavailable");
    for (const raw of claimed.data ?? []) {
      const parsed = eventSchema.safeParse(raw);
      if (!parsed.success) throw new Error("invalid_queue_row");
      const alert = parsed.data;
      let provider: string | null = null;
      try {
        const body = operationAlertMessage(alert);
        const prepared = await db.rpc("member_operation_alert_prepare", {
          p_id: alert.id,
          p_lease: alert.lease_token,
          p_body: JSON.stringify(body),
        });
        if (prepared.error || typeof prepared.data !== "string")
          throw new Error("queue_prepare_failed");
        const response = await request(
          gateway
            ? "https://connector-gateway.lovable.dev/resend/emails"
            : "https://api.resend.com/emails",
          {
            method: "POST",
            redirect: "manual",
            signal: AbortSignal.timeout(12_000),
            headers: {
              Authorization: `Bearer ${gateway ?? key}`,
              ...(gateway ? { "X-Connection-Api-Key": key } : {}),
              "Content-Type": "application/json",
              "Idempotency-Key": `member-operation-${alert.id}`,
            },
            body: prepared.data,
          },
        );
        if (!response.ok) throw new Error("delivery_failed");
        const value = await response.json();
        if (
          typeof value.id !== "string" ||
          !/^[a-zA-Z0-9_-]{3,160}$/.test(value.id)
        )
          throw new Error("delivery_uncertain");
        provider = value.id;
      } catch {
        // Error codes contain neither the provider response nor member details.
      }
      const saved = await db.rpc("member_operation_alert_finish", {
        p_id: alert.id,
        p_lease: alert.lease_token,
        p_provider: provider,
        p_error: provider ? null : "delivery_retry",
      });
      if (saved.error || saved.data !== true)
        throw new Error("queue_ack_failed");
      if (provider) accepted++;
    }
    return { accepted, configured: true };
  } catch {
    console.error("[member-operation-alerts] queue_processing_failed");
    return { accepted, configured: true };
  }
}
