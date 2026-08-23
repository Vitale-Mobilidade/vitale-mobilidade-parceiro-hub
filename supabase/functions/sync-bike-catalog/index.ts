import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { runBikeCatalogSync } from "../_shared/bike-sync.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Force só é permitido com service role (cron/admin), nunca publicamente.
  const authHeader = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  const isAdmin = SERVICE_ROLE_KEY.length > 0 && authHeader === SERVICE_ROLE_KEY;
  const url = new URL(req.url);
  const force = isAdmin && url.searchParams.get("force") === "true";

  const { status, body } = await runBikeCatalogSync(supabase, {
    force,
    supabaseUrl: SUPABASE_URL,
    serviceKey: SERVICE_ROLE_KEY,
  });
  return json(body, status);
});
