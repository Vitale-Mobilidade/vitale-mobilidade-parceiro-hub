export type PriceAlertMetrics = {
  totalAlerts: number;
  people: number;
  activeRegistrations: number;
  recent7d: number;
  daily: Array<{ day: string; registrations: number }>;
  export: { failed: number; pending: number; oldestPending: string | null };
  email: Record<string, number>;
};
export type PriceAlertRemote = {
  request_id: string;
  status:
    "active" | "processing" | "sent" | "cancelled" | "failed" | "uncertain";
  sent_at: string | null;
  receipt: "delivered" | "read" | "failed" | null;
  registration?: { status: string; sent_at: string | null } | null;
  follow_up?: { status: string; sent_at: string | null } | null;
};
export type PriceAlertReconciliation = {
  total: number;
  waiting: number;
  delivered: number;
  inDelivery: number;
  needsAttention: number;
  closed: number;
  issues: {
    notTracking: number;
    unconfirmed: number;
    sendFailed: number;
    deliveryFailed: number;
  };
};

/** One current state per local alert; message receipts never add extra alerts. */
export function reconcilePriceAlerts(
  alerts: Array<{ id: string; status: string; consent: boolean }>,
  statuses: Map<string, PriceAlertRemote>,
): PriceAlertReconciliation {
  const result: PriceAlertReconciliation = {
    total: alerts.length,
    waiting: 0,
    delivered: 0,
    inDelivery: 0,
    needsAttention: 0,
    closed: 0,
    issues: {
      notTracking: 0,
      unconfirmed: 0,
      sendFailed: 0,
      deliveryFailed: 0,
    },
  };
  for (const alert of alerts) {
    const remote = statuses.get(alert.id);
    if (
      alert.status !== "active" ||
      !alert.consent ||
      remote?.status === "cancelled"
    ) {
      result.closed++;
    } else if (!remote) {
      result.issues.notTracking++;
    } else if (remote.status === "active") {
      result.waiting++;
    } else if (remote.status === "processing") {
      result.inDelivery++;
    } else if (remote.status === "uncertain") {
      result.issues.unconfirmed++;
    } else if (remote.status === "failed") {
      result.issues.sendFailed++;
    } else if (remote.receipt === "failed") {
      result.issues.deliveryFailed++;
    } else if (remote.receipt === "delivered" || remote.receipt === "read") {
      result.delivered++;
    } else {
      result.inDelivery++;
    }
  }
  result.needsAttention = Object.values(result.issues).reduce(
    (total, count) => total + count,
    0,
  );
  return result;
}

export type RadarAlertOverview = {
  reconciliation?: PriceAlertReconciliation | null;
  local: PriceAlertMetrics | null;
  remote: {
    available: boolean;
    counts: Record<string, number>;
    checkedAt: string | null;
  };
};
