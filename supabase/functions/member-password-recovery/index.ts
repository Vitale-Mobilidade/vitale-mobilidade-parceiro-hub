// Public recovery endpoint. Supabase owns the credentials/tokens; the existing
// Resend connection owns delivery. No default Auth email or signup confirmation.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendMemberRecovery } from "../_shared/member-recovery.ts";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const redirectTo = "https://vitalemobilidade.com/conta?modo=senha";
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 1200) return json({ ok: false }, 400);
    const body = JSON.parse(raw || "{}");
    if (!body || typeof body !== "object" || Array.isArray(body)) return json({ ok: false }, 400);
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true });
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ ok: false }, 400);
    const key = Deno.env.get("RESEND_API_KEY");
    const gatewayKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (Deno.env.get("MEMBER_PASSWORD_RECOVERY_ENABLED") === "false" || !key || !supabaseUrl || !serviceKey) return json({ ok: false }, 503);
    const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("cf-connecting-ip") ?? "unknown";
    const fingerprint = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)))).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
    const { data: allowed, error: limitError } = await db.rpc("member_password_recovery_budget", { p_email: email, p_fingerprint: fingerprint });
    if (limitError) return json({ ok: false }, 503);
    if (allowed !== true) return json({ ok: true });
    const { data: settings, error: settingsError } = await db.from("newsletter_settings").select("from_email").eq("singleton", true).maybeSingle();
    if (settingsError || !settings?.from_email) return json({ ok: false }, 503);
    // This only generates a recovery link for an existing account; it never
    // creates one and never asks Supabase/Lovable to send an email.
    const { data, error } = await db.auth.admin.generateLink({ type: "recovery", email, options: { redirectTo } });
    if (error || !data?.properties?.action_link) return json({ ok: true });
    const actionUrl = new URL(data.properties.action_link);
    if (actionUrl.origin !== new URL(supabaseUrl).origin || actionUrl.pathname !== "/auth/v1/verify" || actionUrl.searchParams.get("type") !== "recovery" || actionUrl.searchParams.get("redirect_to") !== redirectTo) throw new Error("invalid_recovery_link");
    try {
      await sendMemberRecovery({ email, from: settings.from_email, link: actionUrl.href, key, gatewayKey });
    } catch {
      // Same response for unknown accounts, quota and provider failures. Never
      // log email, token, link, provider body, request body or credentials.
      console.error("member_password_recovery_delivery_failed");
    }
    return json({ ok: true });
  } catch {
    return json({ ok: false }, 503);
  }
});
