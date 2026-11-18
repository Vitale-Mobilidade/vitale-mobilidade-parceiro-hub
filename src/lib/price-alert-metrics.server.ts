import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  reconcilePriceAlerts,
  type RadarAlertOverview,
  type PriceAlertRemote,
} from "./price-alert-metrics";
const notification = z
  .object({ status: z.string().max(30), sent_at: z.string().nullable() })
  .nullable()
  .optional();
const statusResponse = z.object({
  ok: z.literal(true),
  items: z.array(
    z.object({
      request_id: z.string().uuid(),
      status: z.enum([
        "active",
        "processing",
        "sent",
        "cancelled",
        "failed",
        "uncertain",
      ]),
      sent_at: z.string().nullable(),
      receipt: z.enum(["delivered", "read", "failed"]).nullable(),
      registration: notification,
      follow_up: notification,
    }),
  ),
});
export async function readPriceAlertOverview(
  db: SupabaseClient,
  request: typeof fetch = fetch,
): Promise<{
  overview: RadarAlertOverview;
  statuses: Map<string, PriceAlertRemote>;
}> {
  const local = await db.rpc("price_alert_metrics");
  const overview: RadarAlertOverview = {
    local: local.error ? null : local.data,
    reconciliation: null,
    remote: { available: false, counts: {}, checkedAt: null },
  };
  const statuses = new Map<string, PriceAlertRemote>();
  const key = process.env.HOTPIPE_PRICE_ALERT_API_KEY;
  if (!key || !/^hp_[a-f0-9]{48}$/.test(key)) return { overview, statuses };
  const cohort = await db
    .from("bike_price_alerts")
    .select("id,status,consent")
    .limit(1001);
  if (cohort.error || !cohort.data || cohort.data.length > 1000)
    return { overview, statuses };
  const alertIds = new Set(cohort.data.map((alert) => alert.id));
  if (alertIds.size !== cohort.data.length) return { overview, statuses };
  // Query only opaque IDs. Do not export the subscriber list to the browser or logs.
  const links = await db
    .from("price_alert_hotpipe_requests")
    .select("alert_id,request_id")
    .limit(1001);
  if (links.error || !links.data || links.data.length > 1000)
    return { overview, statuses };
  try {
    const byRequest = new Map(
      links.data
        .filter((x) => alertIds.has(x.alert_id))
        .map((x) => [x.request_id, x.alert_id]),
    );
    const ids = [...byRequest.keys()];
    const counts: Record<string, number> = { not_received: 0 };
    for (let start = 0; start < ids.length; start += 100) {
      const batch = ids.slice(start, start + 100);
      const res = await request.call(
        globalThis,
        "https://smixxobbszyxqauysvor.supabase.co/functions/v1/api-price-alerts",
        {
          method: "POST",
          redirect: "manual",
          signal: AbortSignal.timeout(5000),
          headers: { "Content-Type": "application/json", "x-api-key": key },
          body: JSON.stringify({ operation: "status", request_ids: batch }),
        },
      );
      if (!res.ok) throw new Error();
      const parsed = statusResponse.parse(await res.json());
      const seen = new Set<string>();
      for (const item of parsed.items) {
        if (!batch.includes(item.request_id) || seen.has(item.request_id))
          throw new Error();
        seen.add(item.request_id);
        statuses.set(byRequest.get(item.request_id)!, item);
        counts[item.status] = (counts[item.status] ?? 0) + 1;
        if (item.receipt)
          counts[`receipt_${item.receipt}`] =
            (counts[`receipt_${item.receipt}`] ?? 0) + 1;
      }
      counts.not_received += batch.length - seen.size;
    }
    if (overview.local?.totalAlerts === cohort.data.length) {
      overview.reconciliation = reconcilePriceAlerts(cohort.data, statuses);
    }
    overview.remote = {
      available: true,
      counts,
      checkedAt: new Date().toISOString(),
    };
  } catch {
    statuses.clear(); // A partial remote read must not look like a complete total.
  }
  return { overview, statuses };
}
