import { z } from "https://deno.land/x/zod@v3.23.8/mod.ts";

const CRM_WEBHOOK_URL = "https://hook.us1.make.com/vvxovixmmoi4tip31x7bh3yd982xzqga";
const WEBHOOK_DESTINATION = "make_webhook";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const leadFields = [
  "utm_medium", "utm_campaign", "utm_content", "utm_term", "device_type", "browser", "operating_system",
  "status", "current_step", "completion_percentage", "started_at", "completed_at", "last_interaction_at",
  "main_use", "main_use_label", "daily_km_range", "daily_km_range_label", "route_type", "route_type_label",
  "rider_capacity_need", "rider_capacity_need_label", "weight_range", "weight_range_label",
  "budget_range", "budget_range_label", "had_ebike_before", "had_ebike_before_label", "usage_cluster",
  "distance_cluster", "route_cluster", "passenger_cluster", "weight_cluster",
  "budget_cluster", "experience_cluster", "intent_cluster", "recommendation_profile",
  "recommended_bike_1", "recommended_bike_1_label", "recommended_bike_1_score", "recommended_bike_1_reason", "recommended_bike_1_link",
  "recommended_bike_2", "recommended_bike_2_label", "recommended_bike_2_score", "recommended_bike_2_reason", "recommended_bike_2_link",
  "recommendation_reason", "conversion_status", "clicked_bike_name", "clicked_bike_position", "clicked_bike_link", "clicked_at",
  "purchase_link_used", "link_group_used", "bike_model_clicked",
  "buy_click_count", "crm_webhook_status", "last_webhook_sent_at", "webhook_error_message", "raw_answers_json", "raw_recommendation_json",
  "name", "phone", "source_url", "landing_path", "referrer", "utm_source",
  "referrer_domain", "detected_source", "detected_medium", "traffic_origin",
  "webhook_status", "webhook_attempts", "webhook_sent_at", "webhook_last_attempt_at",
  "webhook_last_error", "webhook_last_response",
  "fbclid", "gclid", "first_url", "first_seen_at", "submitted_at", "user_agent",
] as const;

const eventNames = new Set([
  "quiz_started", "quiz_step_completed", "quiz_completed", "recommendation_generated",
  "buy_button_clicked", "secondary_option_clicked", "quiz_restart_clicked", "result_shared_whatsapp", "offers_group_clicked",
  "specialist_whatsapp_clicked", "floating_specialist_whatsapp_clicked",
  "affiliate_list_clicked",
  "primary_offer_popup_viewed", "primary_offer_popup_clicked", "primary_offer_popup_dismissed", "primary_offer_popup_returned",
  "offers_post_click_popup_viewed", "offers_post_click_popup_clicked", "offers_post_click_popup_dismissed", "offers_post_click_popup_returned",
  "result_tab_refocused_after_external_click",
  // SDR IA "Lucas"
  "sdr_invite_viewed", "sdr_auto_open_scheduled", "sdr_auto_opened", "sdr_auto_open_cancelled",
  "sdr_opened_manually", "sdr_closed_by_user", "sdr_quick_question_clicked",
  "sdr_message_sent", "sdr_response_received", "sdr_comparison_requested",
  "sdr_high_intent_detected", "sdr_link_offered", "sdr_link_sent",
  "sdr_purchase_link_clicked", "sdr_offers_group_link_sent", "sdr_offers_group_link_clicked",
  "sdr_bike_list_link_sent", "sdr_bike_list_link_clicked",
  "sdr_human_handoff_requested", "sdr_conversation_closed",
  "sdr_consultoria_offered", "sdr_purchase_intent_detected",
  // Consultoria paga e grupo de ofertas
  "consultoria_cta_clicked", "whatsapp_group_clicked",
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
  const payload = pickLeadFields(lead);
  // Quando o lead já chega com nome+telefone, marca pendente de envio ao Make.
  if (payload.name && payload.phone && payload.webhook_status === undefined) {
    payload.webhook_status = "pending";
  }
  const rows = await dbFetch("quiz_leads?select=id", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(payload),
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

async function patchLeadRaw(leadId: string, patch: Record<string, unknown>) {
  await dbFetch(`quiz_leads?id=eq.${leadId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

async function rpcIncrementAttempts(leadId: string): Promise<number> {
  // PostgREST não suporta incremento atômico via PATCH; lemos e gravamos.
  const rows = await dbFetch(`quiz_leads?id=eq.${leadId}&select=webhook_attempts`, { method: "GET" });
  const current = Array.isArray(rows) && rows[0]?.webhook_attempts ? Number(rows[0].webhook_attempts) : 0;
  const next = current + 1;
  await patchLeadRaw(leadId, {
    webhook_attempts: next,
    webhook_status: "sending",
    webhook_last_attempt_at: new Date().toISOString(),
  });
  return next;
}

async function insertEvent(event: Record<string, unknown>, leadId?: string | null) {
  await dbFetch("quiz_events", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(sanitizeEvent(event, leadId)),
  });
}

async function insertIntegrationLog(entry: Record<string, unknown>) {
  try {
    await dbFetch("integration_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(entry),
    });
  } catch (e) {
    console.error("[integration_logs] insert failed", e instanceof Error ? e.message : e);
  }
}

async function sendCrmWebhook(payload: Record<string, unknown>) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(CRM_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const body = await res.text().catch(() => "");
    return { success: res.ok, status: res.status, body: body.slice(0, 2000) };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Dispara o webhook do Make pelo backend, atualiza o quiz_leads
 * (webhook_status, attempts, timestamps, erro/resposta) e grava em integration_logs.
 * Esta função NUNCA depende de evento de browser. Sempre tenta enviar.
 */
async function fireWebhookForLead(
  leadId: string,
  basePayload: Record<string, unknown>,
  eventName: string,
) {
  // 1) Marca como "sending" e incrementa attempts.
  let attempt = 0;
  try {
    attempt = await rpcIncrementAttempts(leadId);
  } catch (e) {
    console.error("[webhook] failed to mark sending", e);
  }

  // 2) Garante que o id do Lovable está no payload (campo LeadID Lovable para o Zoho).
  const payload = {
    ...basePayload,
    id: leadId,
    lead_id: leadId,
    "LeadID Lovable": leadId,
    event: { event_name: eventName },
  };

  let result: { success: boolean; status?: number; body?: string; error?: string };
  try {
    const r = await sendCrmWebhook(payload);
    result = r;
  } catch (e) {
    result = { success: false, error: e instanceof Error ? e.message : String(e) };
  }

  // 3) Atualiza o lead com o desfecho.
  const nowIso = new Date().toISOString();
  const patch: Record<string, unknown> = {
    webhook_status: result.success ? "sent" : "failed",
    webhook_last_response: result.body ?? null,
    webhook_last_error: result.success ? null : (result.error ?? `HTTP ${result.status}`),
    crm_webhook_status: result.success ? "enviado" : "erro_webhook",
    last_webhook_sent_at: nowIso,
    webhook_error_message: result.success ? null : (result.error ?? `HTTP ${result.status}`)?.toString().slice(0, 500),
  };
  if (result.success) patch.webhook_sent_at = nowIso;

  await patchLeadRaw(leadId, patch).catch((e) => console.error("[webhook] failed to patch lead outcome", e));

  // 4) Loga a tentativa.
  await insertIntegrationLog({
    lead_id: leadId,
    event_name: eventName,
    destination: WEBHOOK_DESTINATION,
    status: result.success ? "success" : "failed",
    http_status: result.status ?? null,
    attempt,
    request_payload: payload,
    response_payload: result.body ?? null,
    error_message: result.success ? null : (result.error ?? `HTTP ${result.status}`),
  });

  return { ...result, attempt };
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
      // 1) Atualiza o lead e marca como pendente de envio.
      try {
        await updateLead(lead_id, { ...lead, webhook_status: "pending" });
        await insertEvent({ event_name: "quiz_completed", step: 5, payload: webhook_payload ?? lead }, lead_id);
        await insertEvent({ event_name: "recommendation_generated", payload: recommendation_event_payload ?? null }, lead_id);
      } catch (error) {
        dbError = error instanceof Error ? error.message : String(error);
      }

      // 2) Dispara webhook pelo backend, registrando status e log.
      webhook = await fireWebhookForLead(lead_id, webhook_payload ?? lead, "quiz_completed");

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
      try {
        const r = await sendCrmWebhook(webhook_payload ?? { event_name: event.event_name, lead_id, id: lead_id, "LeadID Lovable": lead_id });
        webhook = r;
        await insertIntegrationLog({
          lead_id,
          event_name: typeof event.event_name === "string" ? event.event_name : "buy_click",
          destination: WEBHOOK_DESTINATION,
          status: r.success ? "success" : "failed",
          http_status: r.status ?? null,
          attempt: null,
          request_payload: webhook_payload ?? null,
          response_payload: r.body ?? null,
          error_message: r.success ? null : `HTTP ${r.status}`,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        webhook = { success: false, error: msg };
        await insertIntegrationLog({
          lead_id, event_name: "buy_click", destination: WEBHOOK_DESTINATION,
          status: "failed", error_message: msg,
        });
      }
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
