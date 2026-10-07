import { createClient } from "@supabase/supabase-js";
import { validHotpipeAck, retryableHotpipeStatus, hotpipeRetryDelay } from "../../supabase/functions/_shared/hotpipe-price-alert";
const ENDPOINT = "https://smixxobbszyxqauysvor.supabase.co/functions/v1/api-price-alerts";
export async function deliverPriceAlertOutbox(req: Request): Promise<Response> {
  if (req.method !== "POST") return new Response(null, { status: 405 });
  if (!req.headers.get("x-worker-signature") || !req.headers.get("x-worker-issued-at")) return new Response(null, { status: 403 });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return new Response(null, { status: 503 });
  const db = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!);
  const { data: authorized, error: authError } = await db.rpc("authorize_price_alert_hotpipe", {
    signature: req.headers.get("x-worker-signature"), issued_at: req.headers.get("x-worker-issued-at"),
  });
  if (authError || authorized !== true) return new Response(null, { status: 403 });
  const apiKey = process.env["HOTPIPE_PRICE_ALERT_API_KEY"]?.trim();
  if (!apiKey) return new Response(JSON.stringify({ ok: false, error: "integration_not_configured" }), { status: 503 });
  if (!/^hp_[a-f0-9]{48}$/.test(apiKey)) return Response.json({ ok: false, error: "integration_invalid_config" }, { status: 503 });
  const { data: events, error: claimError } = await db.rpc("claim_price_alert_hotpipe");
  if (claimError) return new Response(null, { status: 500 });
  let delivered = 0;
  const failures: Array<{ event_id: unknown; name: string; stage: "fetch"; cause_code: string }> = [];
  for (const event of events ?? []) {
    let status = 0; let ack: unknown; let retryAfter: string | null = null;
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(ENDPOINT, { method: "POST", redirect: "manual", headers: { "Content-Type": "application/json", "x-api-key": apiKey }, body: JSON.stringify(event.payload), signal: controller.signal });
      status = response.status; retryAfter = response.headers.get("retry-after");
      ack = await response.json().catch(() => null);
    } catch (failure) {
      const name = failure instanceof Error && ["TypeError", "AbortError", "TimeoutError"].includes(failure.name) ? failure.name : "Error";
      const rawCode = failure instanceof Error && failure.cause && typeof failure.cause === "object" ? String((failure.cause as { code?: unknown }).code ?? "") : "";
      const cause_code = ["ENOTFOUND", "ECONNRESET", "ECONNREFUSED", "UND_ERR_CONNECT_TIMEOUT", "UND_ERR_HEADERS_TIMEOUT"].includes(rawCode) ? rawCode : "unknown";
      console.error("[hotpipe-outbox] delivery_failed", { event_id: event.event_id, name });
      failures.push({ event_id: event.payload?.event_id, name, stage: "fetch", cause_code });
    } finally { clearTimeout(deadline); }
    const accepted = status === 200 && validHotpipeAck(ack, event.payload);
    const code = ack && typeof ack === "object" ? String((ack as Record<string, unknown>).error ?? (ack as Record<string, unknown>).code ?? "") : undefined;
    const retry = !accepted && (status === 200 || retryableHotpipeStatus(status, code)) && event.attempts < 10;
    const { error } = await db.from("price_alert_hotpipe_outbox").update({
      status: accepted ? "delivered" : retry ? "pending" : "failed",
      last_http_status: status, lease_until: null, lease_token: null,
      delivered_at: accepted ? new Date().toISOString() : null,
      next_attempt_at: new Date(Date.now() + hotpipeRetryDelay(event.attempts, retryAfter)).toISOString(),
    }).eq("sequence", event.sequence).eq("lease_token", event.lease_token).eq("status", "processing");
    if (error) return new Response(null, { status: 500 });
    if (accepted) delivered++;
  }
  return Response.json({ ok: true, delivered, build: "manual-v2", ...(failures.length ? { failures } : {}) });
}
