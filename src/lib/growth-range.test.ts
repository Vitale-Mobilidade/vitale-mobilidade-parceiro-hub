import { describe, expect, it } from "vitest";
import {
  growthRange,
  saoPauloDay,
} from "../../supabase/functions/_shared/growth-range";
const now = new Date("2026-10-12T02:30:00Z");
describe("Growth calendar boundaries", () => {
  it("uses São Paulo today, not UTC", () => {
    expect(saoPauloDay(now)).toBe("2026-10-11");
    expect(growthRange({ rangeDays: 1 }, now)).toMatchObject({
      since: "2026-10-11T00:00:00-03:00",
      until: "2026-10-12T00:00:00-03:00",
      rangeDays: 1,
    });
  });
  it("excludes today from yesterday", () => {
    expect(
      growthRange({ startDate: "2026-10-10", endDate: "2026-10-10" }, now),
    ).toMatchObject({
      since: "2026-10-10T00:00:00-03:00",
      until: "2026-10-11T00:00:00-03:00",
      untilDay: "2026-10-11",
    });
  });
  it("handles leap days and inclusive calendar ranges", () => {
    expect(
      growthRange({ startDate: "2024-02-28", endDate: "2024-03-01" }, now)
        .rangeDays,
    ).toBe(3);
    expect(growthRange({ rangeDays: 7 }, now).startDate).toBe("2026-10-05");
  });
  it.each([
    { startDate: "2026-02-30", endDate: "2026-03-01" },
    { startDate: "2026-10-11", endDate: "2026-10-10" },
    { startDate: "2026-10-11", endDate: "2026-10-12" },
    { startDate: "2024-01-01", endDate: "2026-10-11" },
    { startDate: "junk", endDate: "2026-10-11" },
    { startDate: 10, endDate: "2026-10-11" },
  ])("rejects invalid external dates %#", (body) =>
    expect(() => growthRange(body, now)).toThrow(),
  );
});
