import type { SupabaseClient } from "@supabase/supabase-js";
export const saoDay = (date: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function signupDays(timestamps: string[], now = new Date()) {
  const today = saoDay(now);
  const end = new Date(`${today}T12:00:00-03:00`);
  const counts = new Map<string, number>();
  for (const stamp of timestamps) {
    const day = saoDay(new Date(stamp));
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return Array.from({ length: 30 }, (_, i) => {
    const day = saoDay(new Date(end.getTime() - (29 - i) * 86400000));
    return { day, count: counts.get(day) ?? 0 };
  });
}
export async function newsletterMetrics(db: SupabaseClient, now = new Date()) {
  const days = signupDays([], now);
  const timestamps: string[] = [];
  const phones = new Set<string>();
  let alerts = 0;
  // Explicit ranges avoid PostgREST's default row cap. Fail instead of returning partial metrics.
  for (const source of [
    "newsletter_subscriptions",
    "bike_price_alerts",
  ] as const) {
    for (let page = 0; ; page++) {
      if (page >= 100) throw new Error("newsletter_metrics_limit");
      let query = db
        .from(source)
        .select(
          source === "newsletter_subscriptions"
            ? "id,created_at"
            : "id,phone_e164",
        )
        .order("id")
        .range(page * 500, page * 500 + 499);
      query =
        source === "newsletter_subscriptions"
          ? query
              .gte("created_at", `${days[0].day}T00:00:00-03:00`)
              .lte("created_at", now.toISOString())
          : query.eq("status", "active").eq("consent", true);
      const { data, error } = await query;
      if (error) throw new Error("newsletter_database_failed");
      const rows = (data ?? []) as unknown as {
        created_at?: string;
        phone_e164?: string;
      }[];
      for (const row of rows) {
        if (source === "newsletter_subscriptions" && row.created_at)
          timestamps.push(row.created_at);
        if (source === "bike_price_alerts") {
          alerts++;
          if (row.phone_e164) phones.add(row.phone_e164);
        }
      }
      if (rows.length < 500) break;
    }
  }
  return {
    days: signupDays(timestamps, now),
    radarPeople: phones.size,
    radarAlerts: alerts,
    updatedAt: now.toISOString(),
  };
}
