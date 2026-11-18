import { describe, expect, it, vi } from "vitest";
import { readPriceAlertOverview } from "./price-alert-metrics.server";
import type { SupabaseClient } from "@supabase/supabase-js";
const requestId = "10000000-0000-4000-8000-000000000001";
const db = {
  rpc: vi.fn(async () => ({ data: { totalAlerts: 1 }, error: null })),
  from: vi.fn((table: string) => ({
    select: () => ({
      limit: async () => ({
        data:
          table === "bike_price_alerts"
            ? [{ id: "alert-1", status: "active", consent: true }]
            : [{ alert_id: "alert-1", request_id: requestId }],
        error: null,
      }),
    }),
  })),
} as unknown as SupabaseClient;
describe("remote alert metrics", () => {
  it("does not estimate counts when transport fails", async () => {
    vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY", `hp_${"a".repeat(48)}`);
    const result = await readPriceAlertOverview(
      db,
      vi.fn(async () => new Response(null, { status: 503 })),
    );
    expect(result.overview.remote).toMatchObject({
      available: false,
      counts: {},
    });
    expect(result.statuses.size).toBe(0);
    vi.unstubAllEnvs();
  });
  it("counts acceptance and actual delivery separately for exact IDs", async () => {
    vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY", `hp_${"a".repeat(48)}`);
    const result = await readPriceAlertOverview(
      db,
      vi.fn(async () =>
        Response.json({
          ok: true,
          items: [
            {
              request_id: requestId,
              status: "sent",
              sent_at: "2026-11-18T12:00:00Z",
              receipt: "delivered",
            },
          ],
        }),
      ),
    );
    expect(result.overview.remote).toMatchObject({
      available: true,
      counts: { sent: 1, receipt_delivered: 1, not_received: 0 },
    });
    expect(result.statuses.get("alert-1")?.status).toBe("sent");
    expect(result.overview.reconciliation).toMatchObject({
      total: 1,
      delivered: 1,
      needsAttention: 0,
    });
    vi.unstubAllEnvs();
  });
  it("rejects a response for another request rather than attributing it to this subscriber", async () => {
    vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY", `hp_${"a".repeat(48)}`);
    const result = await readPriceAlertOverview(
      db,
      vi.fn(async () =>
        Response.json({
          ok: true,
          items: [
            {
              request_id: "20000000-0000-4000-8000-000000000001",
              status: "sent",
              sent_at: null,
              receipt: null,
            },
          ],
        }),
      ),
    );
    expect(result.overview.remote.available).toBe(false);
    expect(result.statuses.size).toBe(0);
    vi.unstubAllEnvs();
  });
  it("counts requests not received by Hotpipe as real alert pendencies", async () => {
    vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY", `hp_${"a".repeat(48)}`);
    const result = await readPriceAlertOverview(
      db,
      vi.fn(async () => Response.json({ ok: true, items: [] })),
    );
    expect(result.overview.remote.available).toBe(true);
    expect(result.overview.reconciliation).toMatchObject({
      total: 1,
      needsAttention: 1,
      issues: { notTracking: 1 },
    });
    vi.unstubAllEnvs();
  });
  it("withholds the partition if a signup changed the population after the metrics snapshot", async () => {
    vi.stubEnv("HOTPIPE_PRICE_ALERT_API_KEY", `hp_${"a".repeat(48)}`);
    const changed = {
      ...db,
      rpc: vi.fn(async () => ({ data: { totalAlerts: 2 }, error: null })),
    } as unknown as SupabaseClient;
    const result = await readPriceAlertOverview(
      changed,
      vi.fn(async () => Response.json({ ok: true, items: [] })),
    );
    expect(result.overview.remote.available).toBe(true);
    expect(result.overview.reconciliation).toBeNull();
    vi.unstubAllEnvs();
  });
});
