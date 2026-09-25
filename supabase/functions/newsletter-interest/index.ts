// Registra inscrição consentida. Não envia e-mail nem habilita disparos.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const CONSENT_TEXT = "Autorizo a Vitale Mobilidade a guardar meu nome e e-mail e a me contatar sobre a newsletter.";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

async function fingerprint(req: Request): Promise<string> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? req.headers.get("cf-connecting-ip") ?? "unknown";
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 2000) return json({ ok: false }, 400);
    const body = JSON.parse(raw || "{}") as Record<string, unknown>;
    if (typeof body.website === "string" && body.website.trim()) return json({ ok: true });
    const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (name.length < 2 || name.length > 80 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true) {
      return json({ ok: false, error: "Confira nome, e-mail e autorização." }, 400);
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
    const fp = await fingerprint(req);
    const now = new Date();
    const { data: throttle, error: throttleError } = await supabase.from("newsletter_throttle").select("attempts, window_started_at").eq("fingerprint", fp).maybeSingle();
    if (throttleError) return json({ ok: false }, 503);
    const fresh = !throttle || now.getTime() - new Date(throttle.window_started_at as string).getTime() > 10 * 60 * 1000;
    const attempts = fresh ? 1 : Number(throttle.attempts ?? 0) + 1;
    if (attempts > 8) return json({ ok: false, error: "Tente novamente mais tarde." }, 429);
    const { error: rateError } = await supabase.from("newsletter_throttle").upsert({ fingerprint: fp, attempts, window_started_at: fresh ? now.toISOString() : throttle.window_started_at });
    if (rateError) return json({ ok: false }, 503);
    const sourceUrl = typeof body.sourceUrl === "string" && /^https:\/\//.test(body.sourceUrl) ? body.sourceUrl.slice(0, 500) : null;
    const { error } = await supabase.from("newsletter_subscriptions").upsert({
      person_name: name,
      email,
      status: "interested",
      delivery_enabled: false,
      consent_text: CONSENT_TEXT,
      consent_version: "v2",
      consent_at: now.toISOString(),
      source_url: sourceUrl,
      updated_at: now.toISOString(),
    }, { onConflict: "email" });
    if (error) return json({ ok: false }, 503);
    return json({ ok: true });
  } catch {
    // Não registrar nome, e-mail ou corpo da requisição em log.
    return json({ ok: false }, 500);
  }
});
