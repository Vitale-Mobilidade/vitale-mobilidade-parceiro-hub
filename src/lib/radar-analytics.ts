/**
 * Analytics do Radar — SEM PII. Nunca envia nome, telefone ou texto livre.
 */

export type RadarEvent =
  | "radar_viewed"
  | "radar_detail_viewed"
  | "radar_period_changed"
  | "radar_ml_click"
  | "radar_alert_opened"
  | "radar_alert_submitted"
  | "radar_alert_success"
  | "radar_alert_error"
  | "radar_group_click"
  | "radar_assistant_navigation"
  | "radar_search_selected";

const ALLOWED_KEYS = new Set([
  "bike_id",
  "position",
  "period",
  "sort",
  "chips",
  "condition",
  "route",
  "target",
  "reason",
  "source",
]);

export function trackRadar(event: RadarEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(payload)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") safe[k] = v;
    if (Array.isArray(v)) safe[k] = v.filter((i) => typeof i === "string").join(",");
  }
  try {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event, ...safe });
  } catch {
    /* analytics nunca quebra a página */
  }
}

export const OFFERS_GROUP_URL = "https://chat.whatsapp.com/EKsWhyOxeEg5XVdbTCYK7g?mode=gi_t";
