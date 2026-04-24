import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const CRM_WEBHOOK_URL = "https://hook.us1.make.com/vvxovixmmoi4tip31x7bh3yd982xzqga";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const leadFields = [
  "utm_medium", "utm_campaign", "utm_content", "utm_term", "device_type", "browser", "operating_system",
  "status", "current_step", "completion_percentage", "started_at", "completed_at", "last_interaction_at",
  "main_use", "main_use_label", "daily_km_range", "daily_km_range_label", "route_type", "route_type_label",
  "budget_range", "budget_range_label", "had_ebike_before", "had_ebike_before_label", "usage_cluster",
  "distance_cluster", "route_cluster", "budget_cluster", "experience_cluster", "intent_cluster", "recommendation_profile",
  "recommended_bike_1", "recommended_bike_1_label", "recommended_bike_1_score", "recommended_bike_1_reason", "recommended_bike_1_link",
  "recommended_bike_2", "recommended_bike_2_label", "recommended_bike_2_score", "recommended_bike_2_reason", "recommended_bike_2_link",
  "recommendation_reason", "conversion_status", "clicked_bike_name", "clicked_bike_position", "clicked_bike_link", "clicked_at",
  "buy_click_count", "crm_webhook_status", "last_webhook_sent_at", "webhook_error_message", "raw_answers_json", "raw_recommendation_json",
  "name", "phone", "source_url", "landing_path", "referrer", "utm_source",
] as const;

const eventNames = new Set([
  "quiz_started", "quiz_step_completed", "quiz_completed", "recommendation_generated",
  "buy_button_clicked", "secondary_option_clicked", "quiz_restart_clicked", "result_shared_whatsapp", "offers_group_clicked",
]);

const BodySchema = z.object({
  action: z.enum(["create_lead", "save_answer", "complete_quiz", "buy_click", "save_event"]),
  lead_id: z.string().uuid().optional().nullable(),
  lead: z.record(z.any()).optional(),
  event: z.record(z.any()).optional(),
  webhook_payload: z.record(z.any()).optional(),
  recommendation_event_payload: z.record(z.any()).optional(),
});

function pickLeadFields(input: Record<string, unknown> = {}) {
  const out: Record<string, unknown> = {};
  for (const key of leadFields) {
    if (input[key] !== undefined) out[key] = input[key];
  }
  return out;
}

function sanitizeEvent(input: Record<string, unknown> = {}, leadId?: string | null) {
  const eventName = typeof input.event_name === "string" ? input.event_name : "";
  if (!eventNames.has(eventName)) throw new Error(`Invalid event_name: ${eventName}`);
  return {
    lead_id: leadId ?? input.lead_id ?? null,
    event_name: eventName,
    step: typeof input.step === "number" ? input.step : null,
    field_name: typeof input.field_name === "string" ? input.field_name : null,
    field_value: typeof input.field_value === "string" ? input.field_value : null,
    field_label: typeof input.field_label === "string" ? input.field_label : null,
    payload: input.payload ?? null,
  };
}

async function dbFetch(path: string, init: RequestInit) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url) throw new Error("SUPABASE_URL is not configured");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");

  const res = await fetch(`${url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`[db] ${init.method ?? "GET"} ${path} failed ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

async function insertLead(lead: Record<string, unknown>) {
  const rows = await dbFetch("quiz_leads?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(pickLeadFields(lead)),
  });
  return Array.isArray(rows) ? rows[0]?.id as string | undefined : undefined;
}

async function updateLead(leadId: string, lead: Record<string, unknown>) {
  await dbFetch(`quiz_leads?id=eq.${leadId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(pickLeadFields(lead)),
  });
}

async function insertEvent(event: Record<string, unknown>, leadId?: string | null) {
  await dbFetch("quiz_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(sanitizeEvent(event, leadId)),
  });
}

async function sendCrmWebhook(payload: Record<string, unknown>) {
  const res = await fetch(CRM_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await res.text().catch(() => "");
  return { success: res.ok, status: res.status, body: body.slice(0, 1000) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ success: false, error: parsed.error.flatten() }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, lead_id, lead = {}, event = {}, webhook_payload, recommendation_event_payload } = parsed.data;
    let dbError: string | null = null;
    let webhook: Record<string, unknown> | null = null;

    if (action === "create_lead") {
      const newLeadId = await insertLead(lead);
      if (!newLeadId) throw new Error("Lead was not created");
      await insertEvent({ event_name: "quiz_started", step: 0, payload: lead }, newLeadId);
      return new Response(JSON.stringify({ success: true, lead_id: newLeadId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!lead_id) throw new Error("lead_id is required for this action");

    if (action === "save_answer") {
      try { await updateLead(lead_id, lead); } catch (error) { dbError = error instanceof Error ? error.message : String(error); }
      try { await insertEvent(event, lead_id); } catch (error) { dbError = [dbError, error instanceof Error ? error.message : String(error)].filter(Boolean).join(" | "); }
      return new Response(JSON.stringify({ success: !dbError, lead_id, db_error: dbError }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save_event") {
      await insertEvent(event, lead_id);
      return new Response(JSON.stringify({ success: true, lead_id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "complete_quiz") {
      try {
        await updateLead(lead_id, lead);
        await insertEvent({ event_name: "quiz_completed", step: 5, payload: webhook_payload ?? lead }, lead_id);
        await insertEvent({ event_name: "recommendation_generated", payload: recommendation_event_payload ?? null }, lead_id);
      } catch (error) {
        dbError = error instanceof Error ? error.message : String(error);
      }

      try {
        webhook = await sendCrmWebhook(webhook_payload ?? lead);
        await updateLead(lead_id, {
          crm_webhook_status: webhook.success ? "enviado" : "erro_webhook",
          last_webhook_sent_at: new Date().toISOString(),
          webhook_error_message: webhook.success ? null : JSON.stringify(webhook).slice(0, 500),
        }).catch(() => undefined);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        webhook = { success: false, error: message };
        await updateLead(lead_id, {
          crm_webhook_status: "erro_webhook",
          last_webhook_sent_at: new Date().toISOString(),
          webhook_error_message: message.slice(0, 500),
        }).catch(() => undefined);
      }

      return new Response(JSON.stringify({ success: !dbError && !!webhook?.success, lead_id, db_error: dbError, webhook }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "buy_click") {
      try {
        await updateLead(lead_id, lead);
        await insertEvent(event, lead_id);
      } catch (error) {
        dbError = error instanceof Error ? error.message : String(error);
      }
      try { webhook = await sendCrmWebhook(webhook_payload ?? { event_name: event.event_name, lead_id }); }
      catch (error) { webhook = { success: false, error: error instanceof Error ? error.message : String(error) }; }
      return new Response(JSON.stringify({ success: !dbError && !!webhook?.success, lead_id, db_error: dbError, webhook }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Unhandled action");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("quiz-track error", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});