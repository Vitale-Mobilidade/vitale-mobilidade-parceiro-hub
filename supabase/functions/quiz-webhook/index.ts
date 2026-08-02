// Envio direto ao Zoho CRM (Leads). Make permanece como contingência opcional
// via CRM_FALLBACK_TO_MAKE (desligado por padrão).
import {
  CRM_DESTINATION,
  makeFallbackEnabled,
  sanitizeText,
  tagsForEvent,
  upsertZohoLead,
  zohoConfigured,
} from "../_shared/zoho-crm.ts";

// Configurable CRM webhook URL (contingência)
const CRM_WEBHOOK_URL = "https://hook.us1.make.com/vvxovixmmoi4tip31x7bh3yd982xzqga";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const eventName = typeof payload?.event?.event_name === "string"
      ? payload.event.event_name
      : (typeof payload?.event_name === "string" ? payload.event_name : "quiz_completed");

    if (zohoConfigured()) {
      const zoho = await upsertZohoLead(payload, {
        tags: tagsForEvent(eventName),
        defaultLeadSource: "Quiz Escolher Bike",
      });
      if (zoho.success) {
        return new Response(
          JSON.stringify({
            success: true,
            destination: CRM_DESTINATION,
            action: zoho.action,
            zoho_id: zoho.zoho_id,
            matched_by: zoho.matched_by,
            status: zoho.status ?? 200,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
      if (!makeFallbackEnabled()) {
        return new Response(
          JSON.stringify({
            success: false,
            destination: CRM_DESTINATION,
            status: zoho.status,
            error: sanitizeText(zoho.error ?? "Zoho upsert failed", 500),
            body: zoho.body,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      }
    }

    const res = await fetch(CRM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    let bodyText = "";
    try { bodyText = await res.text(); } catch (_) {}

    return new Response(
      JSON.stringify({ success: res.ok, destination: "make_webhook", status: res.status, body: bodyText.slice(0, 500) }),
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
