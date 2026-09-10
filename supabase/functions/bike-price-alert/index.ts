// Alerta de queda de preço do Radar Vitale.
// Grava a preferência do usuário. NÃO envia nada nesta fase (delivery_enabled=false).
// Nunca registra nome ou telefone em log.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const MAX_BODY_BYTES = 4000;
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const CONSENT_TEXT =
  "Autorizo a Vitale Mobilidade a usar meu WhatsApp para me avisar sobre queda de preço desta bike.";
const CONSENT_VERSION = "v1";

const GENERIC_OK = { ok: true, message: "Alerta registrado." };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function cleanName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().replace(/\s+/g, " ");
  if (v.length < 2 || v.length > 80) return null;
  return v;
}

/** Aceita telefone brasileiro com DDD e devolve E.164. */
export function toE164BR(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/\D+/g, "");
  const local = digits.startsWith("55") && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length !== 10 && local.length !== 11) return null;
  const ddd = Number(local.slice(0, 2));
  if (ddd < 11 || ddd > 99) return null;
  if (local.length === 11 && local[2] !== "9") return null;
  return `+55${local}`;
}

async function fingerprint(req: Request): Promise<string> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("cf-connecting-ip") ??
    "unknown";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ ok: false, error: "Método não suportado." }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ ok: false, error: "Requisição inválida." }, 400);
    const body = JSON.parse(raw || "{}") as Record<string, unknown>;

    // Honeypot invisível: responde genérico sem gravar.
    if (typeof body.website === "string" && body.website.trim() !== "") return json(GENERIC_OK);

    const fp = await fingerprint(req);
    const now = new Date();
    const { data: throttle } = await supabase
      .from("bike_price_alert_throttle")
      .select("attempts, window_started_at")
      .eq("fingerprint", fp)
      .maybeSingle();
    let attempts = 1;
    if (throttle) {
      const started = new Date(throttle.window_started_at as string).getTime();
      const fresh = now.getTime() - started > RATE_WINDOW_MS;
      attempts = fresh ? 1 : Number(throttle.attempts ?? 0) + 1;
      if (!fresh && attempts > RATE_LIMIT) {
        return json({ ok: false, error: "Muitas tentativas. Tente novamente mais tarde." }, 429);
      }
      await supabase.from("bike_price_alert_throttle").update({
        attempts,
        window_started_at: fresh ? now.toISOString() : throttle.window_started_at,
        updated_at: now.toISOString(),
      }).eq("fingerprint", fp);
    } else {
      await supabase.from("bike_price_alert_throttle").insert({
        fingerprint: fp,
        attempts: 1,
        window_started_at: now.toISOString(),
      });
    }

    const name = cleanName(body.name);
    const phone = toE164BR(body.phone);
    const consent = body.consent === true;
    const bikeId = typeof body.bikeId === "string" ? body.bikeId.trim() : "";
    const condition = body.condition === "target" ? "target" : "any_drop";
    const targetPrice = condition === "target" ? Number(body.targetPrice) : null;

    if (!name) return json({ ok: false, error: "Informe seu nome." }, 400);
    if (!phone) return json({ ok: false, error: "Informe um WhatsApp válido com DDD." }, 400);
    if (!consent) return json({ ok: false, error: "É preciso autorizar o contato." }, 400);
    if (!bikeId) return json({ ok: false, error: "Bike inválida." }, 400);

    // Elegibilidade e preço vêm SEMPRE do servidor.
    const { data: bike, error: bikeErr } = await supabase.rpc("get_bike_price_history", {
      p_bike_id: bikeId,
      p_days: 7,
    });
    if (bikeErr || !bike || typeof bike !== "object") {
      return json({ ok: false, error: "Bike indisponível para alerta." }, 400);
    }
    const referencePrice = Number((bike as Record<string, unknown>).currentPrice ?? 0);
    const bikeName = String((bike as Record<string, unknown>).name ?? "");
    if (!(referencePrice > 0) || !bikeName) {
      return json({ ok: false, error: "Bike indisponível para alerta." }, 400);
    }
    if (condition === "target") {
      if (!Number.isFinite(targetPrice as number) || (targetPrice as number) <= 0 || (targetPrice as number) >= referencePrice) {
        return json({ ok: false, error: "Escolha um valor abaixo do preço atual." }, 400);
      }
    }

    const attribution = (body.attribution ?? {}) as Record<string, unknown>;
    const str = (k: string) => {
      const v = attribution[k];
      return typeof v === "string" && v.trim() !== "" ? v.slice(0, 500) : null;
    };

    const payload = {
      bike_id: bikeId,
      bike_name: bikeName,
      person_name: name,
      phone_e164: phone,
      condition,
      target_price: condition === "target" ? targetPrice : null,
      reference_price: referencePrice,
      status: "active",
      delivery_enabled: false,
      consent: true,
      consent_text: CONSENT_TEXT,
      consent_version: CONSENT_VERSION,
      consent_at: now.toISOString(),
      source_url: str("source_url"),
      traffic_origin: str("traffic_origin"),
      utm_source: str("utm_source"),
      utm_medium: str("utm_medium"),
      utm_campaign: str("utm_campaign"),
      utm_content: str("utm_content"),
      utm_term: str("utm_term"),
      updated_at: now.toISOString(),
    };

    // Dedupe telefone + bike ativo: reenvio atualiza a preferência.
    const { data: existing } = await supabase
      .from("bike_price_alerts")
      .select("id")
      .eq("phone_e164", phone)
      .eq("bike_id", bikeId)
      .eq("status", "active")
      .maybeSingle();

    if (existing?.id) {
      const { error } = await supabase.from("bike_price_alerts").update(payload).eq("id", existing.id);
      if (error) throw error;
      return json({ ...GENERIC_OK, updated: true });
    }

    const { error } = await supabase.from("bike_price_alerts").insert(payload);
    if (error) throw error;
    return json({ ...GENERIC_OK, updated: false });
  } catch (e) {
    console.error("[bike-price-alert] falha:", e instanceof Error ? e.message : "erro");
    return json({ ok: false, error: "Não foi possível registrar agora." }, 500);
  }
});
