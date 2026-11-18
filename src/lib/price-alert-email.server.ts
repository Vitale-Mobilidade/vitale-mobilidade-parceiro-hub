import type { SupabaseClient } from "@supabase/supabase-js";
import {
  priceAlertEmailMessage,
  priceAlertEmailSchema,
} from "./price-alert-email";

/** Only invoked by the existing authenticated HMAC worker. Each POST has a durable reservation. */
export async function deliverPriceAlertEmails(
  db: SupabaseClient,
  request: typeof fetch = fetch,
) {
  const key = process.env.RESEND_API_KEY,
    gateway = process.env.LOVABLE_API_KEY;
  if (!key) return { configured: false, accepted: 0 };
  let accepted = 0;
  const claimed = await db.rpc("claim_price_alert_emails");
  if (claimed.error)
    return { configured: true, accepted, error: "email_queue_unavailable" };
  for (const raw of claimed.data ?? []) {
    const parsed = priceAlertEmailSchema.safeParse(raw);
    if (!parsed.success)
      return { configured: true, accepted, error: "email_payload_invalid" };
    const alert = parsed.data;
    let outcome = "failed",
      provider: string | null = null,
      code: string | null = "email_preflight_failed";
    let started = false;
    try {
      const prepared = await db.rpc("prepare_price_alert_email", {
        p_id: alert.id,
        p_lease: alert.lease_token,
        p_body: JSON.stringify(priceAlertEmailMessage(alert)),
      });
      if (prepared.error || typeof prepared.data !== "string")
        throw new Error();
      started = true;
      const response = await request.call(
        globalThis,
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
            "Idempotency-Key": `price-alert-${alert.id}`,
          },
          body: prepared.data,
        },
      );
      if (response.ok) {
        const value = await response.json();
        if (
          typeof value.id !== "string" ||
          !/^[a-zA-Z0-9_-]{3,160}$/.test(value.id)
        )
          throw new Error();
        provider = value.id;
        outcome = "accepted";
        code = null;
      } else if (response.status === 429) {
        outcome = "pending";
        code = "email_rate_limited";
      } else if (response.status >= 500 || response.status === 408) {
        outcome = "uncertain";
        code = "email_outcome_unknown";
      } else {
        outcome = "failed";
        code = `email_rejected_${response.status}`;
      }
    } catch {
      if (started) {
        outcome = "uncertain";
        code = "email_outcome_unknown";
      }
    }
    const saved = await db.rpc("finish_price_alert_email", {
      p_id: alert.id,
      p_lease: alert.lease_token,
      p_status: outcome,
      p_provider: provider,
      p_error: code,
    });
    if (saved.error || saved.data !== true)
      return { configured: true, accepted, error: "email_finalize_failed" };
    if (provider) accepted++;
  }
  return { configured: true, accepted };
}
