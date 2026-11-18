import { describe, expect, it } from "vitest";
import {
  reconcilePriceAlerts,
  type PriceAlertRemote,
} from "./price-alert-metrics";

export function sixtyAlertFixture() {
  const alerts: Array<{ id: string; status: string; consent: boolean }> = [];
  const statuses = new Map<string, PriceAlertRemote>();
  const add = (
    count: number,
    status?: PriceAlertRemote["status"],
    receipt: PriceAlertRemote["receipt"] = null,
  ) => {
    for (let i = 0; i < count; i++) {
      const id = `alert-${alerts.length}`;
      alerts.push({ id, status: "active", consent: true });
      if (status)
        statuses.set(id, { request_id: id, status, sent_at: null, receipt });
    }
  };
  add(17, "active");
  add(7, "sent", "delivered");
  add(7, "sent", "read");
  add(1, "sent");
  add(5, "sent", "failed");
  add(12, "uncertain");
  add(1, "failed");
  add(10);
  return { alerts, statuses };
}

describe("Radar alert reconciliation", () => {
  it("accounts for every one of 60 alerts without treating 20 accepted messages as 20 deliveries", () => {
    const { alerts, statuses } = sixtyAlertFixture();
    const result = reconcilePriceAlerts(alerts, statuses);
    expect(result).toEqual({
      total: 60,
      waiting: 17,
      delivered: 14,
      inDelivery: 1,
      needsAttention: 28,
      closed: 0,
      issues: {
        notTracking: 10,
        unconfirmed: 12,
        sendFailed: 1,
        deliveryFailed: 5,
      },
    });
    expect(
      result.waiting +
        result.delivered +
        result.inDelivery +
        result.needsAttention +
        result.closed,
    ).toBe(result.total);
  });
  it("closes cancelled or unauthorized local alerts, respects remote cancellation and ignores orphan remote requests", () => {
    const alerts = [
      { id: "inactive", status: "cancelled", consent: true },
      { id: "revoked", status: "active", consent: false },
      { id: "remote-cancelled", status: "active", consent: true },
      { id: "processing", status: "active", consent: true },
    ];
    const statuses = new Map<string, PriceAlertRemote>([
      [
        "inactive",
        { request_id: "a", status: "sent", receipt: "read", sent_at: null },
      ],
      [
        "remote-cancelled",
        { request_id: "b", status: "cancelled", receipt: null, sent_at: null },
      ],
      [
        "processing",
        { request_id: "c", status: "processing", receipt: null, sent_at: null },
      ],
      [
        "orphan",
        { request_id: "d", status: "sent", receipt: "read", sent_at: null },
      ],
    ]);
    expect(reconcilePriceAlerts(alerts, statuses)).toMatchObject({
      total: 4,
      closed: 3,
      inDelivery: 1,
      delivered: 0,
      needsAttention: 0,
    });
  });
});
