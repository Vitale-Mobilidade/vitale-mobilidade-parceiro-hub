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
export type RadarAlertOverview = {
  local: PriceAlertMetrics | null;
  remote: {
    available: boolean;
    counts: Record<string, number>;
    checkedAt: string | null;
  };
};
