// Reprocessa leads completos que ficaram com webhook_status pending/failed
// e tem webhook_attempts < 5. Sempre pode ser chamada manualmente:
//   POST /functions/v1/quiz-reprocess  { "limit": 50 }

import {
  CRM_DESTINATION,
  makeFallbackEnabled,
  sanitizeText,
  tagsForEvent,
  upsertZohoLead,
  zohoConfigured,
} from "../_shared/zoho-crm.ts";

const CRM_WEBHOOK_URL = "https://hook.us1.make.com/vvxovixmmoi4tip31x7bh3yd982xzqga";
const WEBHOOK_DESTINATION = "make_webhook";
const MAX_ATTEMPTS = 5;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function dbFetch(path: string, init: RequestInit) {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase env vars not configured");
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

async function patchLead(leadId: string, patch: Record<string, unknown>) {
  await dbFetch(`quiz_leads?id=eq.${leadId}`, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(patch),
  });
}

async function insertLog(entry: Record<string, unknown>) {
  try {
    await dbFetch("integration_logs", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify(entry),
    });
  } catch (e) {
    console.error("[integration_logs] insert failed", e);
  }
}

async function sendMakeWebhook(payload: Record<string, unknown>) {
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

/** Envio primário ao Zoho CRM, com fallback opcional ao Make. */
async function sendWebhook(payload: Record<string, unknown>, eventName = "quiz_completed") {
  if (!zohoConfigured()) {
    const r = await sendMakeWebhook(payload);
    return { ...r, destination: WEBHOOK_DESTINATION, zoho_action: null as string | null };
  }
  const zoho = await upsertZohoLead(payload, {
    tags: tagsForEvent(eventName),
    eventName,
  });
  if (zoho.success) {
    return {
      success: true,
      status: zoho.status ?? 200,
      body: sanitizeText(JSON.stringify({ action: zoho.action, zoho_id: zoho.zoho_id, matched_by: zoho.matched_by })),
      destination: CRM_DESTINATION,
      zoho_action: zoho.action ?? null,
    };
  }
  if (makeFallbackEnabled()) {
    const r = await sendMakeWebhook(payload);
    return { ...r, destination: WEBHOOK_DESTINATION, zoho_action: null as string | null, error: r.success ? undefined : zoho.error };
  }
  return {
    success: false,
    status: zoho.status,
    body: zoho.body,
    error: zoho.error ?? "Zoho upsert failed",
    destination: CRM_DESTINATION,
    zoho_action: null as string | null,
  };
}

function formatPhoneForWebhook(phone: unknown): string {
  if (phone === null || phone === undefined) return "";
  let digits = String(phone).replace(/\D/g, "");
  if ((digits.length === 13 || digits.length === 12) && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return String(phone);
}

function buildPayload(lead: Record<string, any>) {
  return {
    id: lead.id,
    lead_id: lead.id,
    "LeadID Lovable": lead.id,
    created_at: lead.created_at,
    updated_at: lead.updated_at,
    name: lead.name,
    phone: lead.phone ? formatPhoneForWebhook(lead.phone) : lead.phone,
    answers: {
      principal_use: lead.main_use,
      principal_use_label: lead.main_use_label,
      daily_distance: lead.daily_km_range,
      daily_distance_label: lead.daily_km_range_label,
      terrain: lead.route_type,
      terrain_label: lead.route_type_label,
      rider_capacity_need: lead.rider_capacity_need,
      rider_capacity_need_label: lead.rider_capacity_need_label,
      weight_range: lead.weight_range,
      weight_range_label: lead.weight_range_label,
      budget: lead.budget_range,
      budget_label: lead.budget_range_label,
      experience: lead.had_ebike_before,
      experience_label: lead.had_ebike_before_label,
    },
    clusters: {
      passenger_cluster: lead.passenger_cluster,
      weight_cluster: lead.weight_cluster,
    },
    recommendations: {
      primary_recommendation: lead.recommended_bike_1_label,
      secondary_recommendation: lead.recommended_bike_2_label,
      primary_reason: lead.recommended_bike_1_reason,
      secondary_reason: lead.recommended_bike_2_reason,
      primary_link: lead.recommended_bike_1_link,
      secondary_link: lead.recommended_bike_2_link,
    },
    tracking: {
      utm_source: lead.utm_source,
      utm_medium: lead.utm_medium,
      utm_campaign: lead.utm_campaign,
      utm_content: lead.utm_content,
      utm_term: lead.utm_term,
      source_url: lead.source_url,
      traffic_origin: lead.traffic_origin,
      device_type: lead.device_type,
    },
    event: { event_name: "quiz_completed", reprocessed: true },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const limit = Math.min(Math.max(Number(body.limit) || 25, 1), 200);

    // Após a conciliação histórica de 2026-06-07, NÃO buscamos mais webhook_status IS NULL.
    // Todo lead completo deve estar em um dos status finais. Só reprocessamos os três
    // status abaixo. reconciled_from_crm, excluded_test_lead e sent NUNCA são reprocessados.
    const tail = `&webhook_attempts=lt.${MAX_ATTEMPTS}&name=not.is.null&phone=not.is.null` +
      `&webhook_status=in.(pending,failed,ready_to_reprocess)` +
      `&order=webhook_last_attempt_at.asc.nullsfirst&limit=${limit}&select=*`;
    const leads = (await dbFetch(`quiz_leads?${tail.slice(1)}`, { method: "GET" })) as any[] ?? [];
    console.log(`[quiz-reprocess] found ${leads.length}`);

    const results: any[] = [];
    for (const lead of leads) {
      const nextAttempt = (lead.webhook_attempts ?? 0) + 1;
      const startedAt = new Date().toISOString();
      await patchLead(lead.id, {
        webhook_status: "sending",
        webhook_attempts: nextAttempt,
        webhook_last_attempt_at: startedAt,
      });

      let r: { success: boolean; status?: number; body?: string; error?: string; destination?: string };
      const payload = buildPayload(lead);
      try {
        r = await sendWebhook(payload, "quiz_completed");
      } catch (e) {
        r = { success: false, error: e instanceof Error ? e.message : String(e) };
      }

      const finishedAt = new Date().toISOString();
      await patchLead(lead.id, {
        webhook_status: r.success ? "sent" : "failed",
        webhook_last_response: r.body ?? null,
        webhook_last_error: r.success ? null : (r.error ?? `HTTP ${r.status}`),
        webhook_sent_at: r.success ? finishedAt : lead.webhook_sent_at ?? null,
        crm_webhook_status: r.success ? "enviado" : "erro_webhook",
        last_webhook_sent_at: finishedAt,
        webhook_error_message: r.success ? null : (r.error ?? `HTTP ${r.status}`)?.toString().slice(0, 500),
      });

      await insertLog({
        lead_id: lead.id,
        event_name: "quiz_completed",
        destination: r.destination ?? CRM_DESTINATION,
        status: r.success ? "success" : "failed",
        http_status: r.status ?? null,
        attempt: nextAttempt,
        request_payload: payload,
        response_payload: r.body ?? null,
        error_message: r.success ? null : (r.error ?? `HTTP ${r.status}`),
      });

      results.push({ lead_id: lead.id, attempt: nextAttempt, success: r.success, status: r.status, error: r.error });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, found: leads.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("quiz-reprocess error", message);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
