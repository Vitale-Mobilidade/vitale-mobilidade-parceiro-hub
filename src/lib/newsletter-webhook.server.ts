import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "node:crypto";

export function validResendWebhook(
  raw: string,
  headers: Headers,
  secret: string,
  now = Date.now(),
) {
  const id = headers.get("svix-id"),
    timestamp = headers.get("svix-timestamp"),
    signature = headers.get("svix-signature");
  if (
    !id ||
    !timestamp ||
    !signature ||
    !/^\d{10}$/.test(timestamp) ||
    Math.abs(now / 1000 - Number(timestamp)) > 300 ||
    !secret.startsWith("whsec_")
  )
    return false;
  const key = Buffer.from(secret.slice(6), "base64");
  if (key.length < 16) return false;
  const expected = createHmac("sha256", key)
    .update(`${id}.${timestamp}.${raw}`)
    .digest();
  return signature.split(" ").some((sig) => {
    const [version, value] = sig.split(",");
    if (version !== "v1" || !value) return false;
    const actual = Buffer.from(value, "base64");
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  });
}
export async function resendNewsletterWebhook(request: Request) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return new Response(null, { status: 503 });
  const raw = await request.text();
  if (raw.length > 64_000) return new Response(null, { status: 413 });
  if (!validResendWebhook(raw, request.headers, secret))
    return new Response(null, { status: 403 });
  let event: {
    type: string;
    created_at: string;
    data: Record<string, unknown>;
  };
  try {
    event = JSON.parse(raw);
    if (
      !event ||
      typeof event.type !== "string" ||
      !event.data ||
      typeof event.data !== "object" ||
      typeof event.created_at !== "string" ||
      !Number.isFinite(Date.parse(event.created_at))
    )
      throw new Error();
  } catch {
    return new Response(null, { status: 400 });
  }
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response(null, { status: 503 });
  const db = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  if (event.type === "contact.updated") {
    if (event.data.unsubscribed !== true)
      return Response.json({ ok: true, ignored: true });
    const contact = event.data.id;
    if (typeof contact !== "string" || !/^[a-f0-9-]{36}$/i.test(contact))
      return new Response(null, { status: 400 });
    const { error } = await db.rpc("newsletter_record_event", {
      p_id: request.headers.get("svix-id"),
      p_type: event.type,
      p_emails: [],
      p_contact: contact,
      p_occurred: event.created_at,
    });
    return error
      ? new Response(null, { status: 503 })
      : Response.json({ ok: true });
  }
  if (
    ![
      "email.delivered",
      "email.bounced",
      "email.complained",
      "email.failed",
    ].includes(event.type)
  )
    return Response.json({ ok: true, ignored: true });
  const { data: s, error: readError } = await db
    .from("newsletter_settings")
    .select("from_email")
    .eq("singleton", true)
    .single();
  if (readError) return new Response(null, { status: 503 });
  const from =
    typeof event.data.from === "string"
      ? event.data.from.match(/<?([^<>\s]+@[^<>\s]+)>?$/)?.[1].toLowerCase()
      : null;
  // Webhook belongs to an account, potentially shared by projects. Ignore unrelated senders.
  if (from !== s.from_email.toLowerCase())
    return Response.json({ ok: true, ignored: true });
  const broadcast = event.data.broadcast_id;
  if (typeof broadcast !== "string")
    return Response.json({ ok: true, ignored: true });
  const owned = await db
    .from("newsletter_campaigns")
    .select("id")
    .eq("resend_id", broadcast)
    .maybeSingle();
  if (owned.error) return new Response(null, { status: 503 });
  if (!owned.data) return Response.json({ ok: true, ignored: true });
  const recipients = Array.isArray(event.data.to)
    ? event.data.to
        .filter((x): x is string => typeof x === "string" && x.length <= 254)
        .slice(0, 100)
        .map((x) => x.toLowerCase())
    : [];
  const { error } = await db.rpc("newsletter_record_event", {
    p_id: request.headers.get("svix-id"),
    p_type: event.type,
    p_emails: recipients,
    p_contact: null,
    p_occurred: event.created_at,
    p_broadcast: broadcast,
    p_email_id:
      typeof event.data.email_id === "string" ? event.data.email_id : null,
  });
  return error
    ? new Response(null, { status: 503 })
    : Response.json({ ok: true });
}
