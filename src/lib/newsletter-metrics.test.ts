import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { newsletterMetrics, signupDays } from "./newsletter-metrics.server";
describe("audience metrics", () => {
  it("groups on São Paulo day, includes zero days and excludes dates outside window", () => {
    const days = signupDays(
      ["2026-10-16T02:59:00Z", "2026-10-16T03:00:00Z", "2026-09-01T12:00:00Z"],
      new Date("2026-10-16T12:00:00Z"),
    );
    expect(days).toHaveLength(30);
    expect(days.at(-1)).toEqual({ day: "2026-10-16", count: 1 });
    expect(days.at(-2)).toEqual({ day: "2026-10-15", count: 1 });
    expect(days[0].count).toBe(0);
  });
  it("paginates without losing rows and counts people separately from alerts", async () => {
    const ranges: number[] = [];
    const db = {
      from: (table: string) => {
        let offset = 0;
        type Result = {
          error: null;
          data: { created_at?: string; phone_e164?: string }[];
        };
        type Query = {
          select: () => Query;
          order: () => Query;
          range: (start: number) => Query;
          gte: () => Query;
          lte: () => Query;
          eq: () => Query;
          then: (resolve: (result: Result) => unknown) => unknown;
        };
        const query: Query = {
          select: () => query,
          order: () => query,
          range: (start: number) => {
            offset = start;
            ranges.push(start);
            return query;
          },
          gte: () => query,
          lte: () => query,
          eq: () => query,
          then: (resolve: (result: Result) => unknown) =>
            resolve({
              error: null,
              data:
                table === "newsletter_subscriptions"
                  ? offset === 0
                    ? Array.from({ length: 500 }, () => ({
                        created_at: "2026-10-16T12:00:00Z",
                      }))
                    : [{ created_at: "2026-10-16T12:00:00Z" }]
                  : [
                      { phone_e164: "+5511999999999" },
                      { phone_e164: "+5511999999999" },
                    ],
            }),
        };
        return query;
      },
    };
    const metrics = await newsletterMetrics(
      db as unknown as SupabaseClient,
      new Date("2026-10-16T13:00:00Z"),
    );
    expect(metrics.days.at(-1)?.count).toBe(501);
    expect(metrics.radarPeople).toBe(1);
    expect(metrics.radarAlerts).toBe(2);
    expect(ranges).toContain(500);
  });
});
