import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { EDITORIAL_ALERT_RECIPIENT } from "../../supabase/functions/_shared/editorial-alert";

/** Same operations destination as articles; one accepted alert per edition/error. */
export async function notifyNewsletterError(
  db: SupabaseClient,
  day: string,
  code: string,
) {
  if (code === "newsletter_busy" || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const reason = /^[a-z0-9_]{1,100}$/.test(code)
    ? code
    : "newsletter_operation_failed";
  const identity = `${day}:${reason}`;
  try {
    const prior = await db
      .from("editorial_audit_logs")
      .select("action,created_at")
      .eq("entity_type", "newsletter")
      .eq("entity_id", identity)
      .in("action", ["newsletter_alert_sent", "newsletter_alert_failed"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prior.error) throw new Error("newsletter_alert_audit_failed");
    if (
      prior.data?.action === "newsletter_alert_sent" ||
      (prior.data && Date.parse(prior.data.created_at) > Date.now() - 600_000)
    )
      return;
    const settings = await db
      .from("newsletter_settings")
      .select("from_email")
      .eq("singleton", true)
      .single();
    const key = process.env.RESEND_API_KEY,
      gateway = process.env.LOVABLE_API_KEY;
    if (settings.error || !settings.data?.from_email || !key)
      throw new Error("newsletter_alert_not_configured");
    const response = await fetch(
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
          "Idempotency-Key": `newsletter-error-${createHash("sha256").update(identity).digest("hex")}`,
        },
        body: JSON.stringify({
          from: settings.data.from_email,
          to: [EDITORIAL_ALERT_RECIPIENT],
          subject: `Vitale: newsletter de ${day} precisa de atenção`,
          text: `A newsletter de ${day} encontrou um erro.\nMotivo: ${reason}\nA automação tentará recuperar o que for seguro; este alerta não confirma envio da edição.\nConfira o estado e a prévia no painel:\nhttps://vitalemobilidade.com/admin/newsletter`,
        }),
      },
    );
    if (!response.ok) throw new Error("newsletter_alert_delivery_failed");
    const saved = await db.from("editorial_audit_logs").insert({
      actor: null,
      action: "newsletter_alert_sent",
      entity_type: "newsletter",
      entity_id: identity,
      detail: { day, code: reason },
    });
    if (saved.error) throw new Error("newsletter_alert_audit_failed");
  } catch {
    console.error("[newsletter] newsletter_alert_failed", day, reason);
    try {
      await db.from("editorial_audit_logs").insert({
        actor: null,
        action: "newsletter_alert_failed",
        entity_type: "newsletter",
        entity_id: identity,
        detail: { day, code: reason },
      });
    } catch {
      /* Never mask the original preparation/delivery result. */
    }
  }
}
