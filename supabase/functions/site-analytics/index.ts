import { createClient } from "https://esm.sh/@supabase/supabase-js@2.104.1";
import { validateSiteAnalyticsHit } from "../_shared/site-analytics.ts";

const PRODUCTION_ORIGINS = new Set([
  "https://vitalemobilidade.com",
  "https://www.vitalemobilidade.com",
]);
const limits = new Map<string, { until: number; count: number }>();

async function anonymousRateKey(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(ip),
  );
  // Only a non-reversible, short-lived key reaches memory; raw IP is never stored.
  return Array.from(new Uint8Array(signature).slice(0, 16), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function withinLimit(key: string) {
  const now = Date.now();
  for (const [key, value] of limits) if (value.until < now) limits.delete(key);
  if (!limits.has(key) && limits.size >= 5000) return false;
  const value = limits.get(key) ?? { until: now + 60_000, count: 0 };
  limits.set(key, value);
  return ++value.count <= 60;
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": PRODUCTION_ORIGINS.has(origin)
      ? origin
      : "https://vitalemobilidade.com",
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Cache-Control": "no-store",
    Vary: "Origin",
  };
  const respond = (status: number) =>
    new Response(null, { status, headers: cors });
  if (req.method === "OPTIONS")
    return PRODUCTION_ORIGINS.has(origin) ? respond(204) : respond(403);
  if (req.method !== "POST") return respond(405);
  // Server-side kill switch: absent/false means a successful no-op, never a write.
  if (Deno.env.get("SITE_ANALYTICS_ENABLED") !== "true") return respond(204);
  if (!PRODUCTION_ORIGINS.has(origin)) return respond(403);
  if (!req.headers.get("content-type")?.startsWith("application/json"))
    return respond(415);
  if (Number(req.headers.get("content-length") ?? 0) > 512) return respond(413);
  if (!withinLimit(await anonymousRateKey(req))) return respond(429);
  const raw = await req.text();
  if (raw.length > 512) return respond(413);
  let input: unknown;
  try {
    input = JSON.parse(raw);
  } catch {
    return respond(400);
  }
  const hit = validateSiteAnalyticsHit(input);
  if (!hit) return respond(400);
  try {
    const db = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { persistSession: false },
      },
    );
    const { error } = await db.rpc("record_site_analytics", {
      p_event_name: hit.event,
      p_source_path: hit.sourcePath,
      p_target_path: hit.event === "bike_click" ? hit.targetPath : "",
      p_bike_id: hit.event === "page_view" ? "" : hit.bikeId,
      p_position: hit.event === "affiliate_click" ? hit.position : "",
    });
    return respond(error ? 503 : 204);
  } catch {
    return respond(503);
  }
});
