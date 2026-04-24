import { corsHeaders } from "npm:@supabase/supabase-js@2.95.0/cors";

// Configurable CRM webhook URL
const CRM_WEBHOOK_URL = "https://hook.us1.make.com/vvxovixmmoi4tip31x7bh3yd982xzqga";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();

    const res = await fetch(CRM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const ok = res.ok;
    let bodyText = "";
    try { bodyText = await res.text(); } catch (_) {}

    return new Response(
      JSON.stringify({ success: ok, status: res.status, body: bodyText.slice(0, 500) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "unknown";
    console.error("quiz-webhook error", msg);
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  }
});
