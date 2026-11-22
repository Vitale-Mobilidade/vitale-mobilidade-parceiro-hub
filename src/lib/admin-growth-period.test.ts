import { describe, expect, it } from "vitest";
import {
  growthRange,
  saoPauloDay,
} from "../../supabase/functions/_shared/growth-range";
import { growthPresetRequest } from "./admin-growth-period";

describe("Growth period requests", () => {
  it.each([
    ["this-month", "2026-11-22T12:00:00Z", "2026-11-01", "2026-11-22", 22],
    ["this-month", "2026-12-01T02:30:00Z", "2026-11-01", "2026-11-30", 30],
    ["this-month", "2027-01-01T03:00:00Z", "2027-01-01", "2027-01-01", 1],
    ["this-month", "2024-02-29T12:00:00Z", "2024-02-01", "2024-02-29", 29],
    ["last-month", "2026-11-22T12:00:00Z", "2026-10-01", "2026-10-31", 31],
    ["last-month", "2026-12-01T02:30:00Z", "2026-10-01", "2026-10-31", 31],
    ["last-month", "2027-01-01T03:00:00Z", "2026-12-01", "2026-12-31", 31],
    ["last-month", "2024-03-01T12:00:00Z", "2024-02-01", "2024-02-29", 29],
    ["last-month", "2026-03-01T12:00:00Z", "2026-02-01", "2026-02-28", 28],
  ])(
    "sends %s calendar dates at %s",
    (preset, instant, startDate, endDate, rangeDays) => {
      const now = new Date(instant);
      const request = growthPresetRequest(preset, saoPauloDay(now));
      expect(request).toEqual({ startDate, endDate });
      expect(growthRange(request, now)).toMatchObject({
        startDate,
        endDate,
        rangeDays,
      });
    },
  );

  it.each([
    ["2026-11-22T12:00:00Z", "2026-11-09", "2026-11-22"],
    ["2026-11-23T02:30:00Z", "2026-11-09", "2026-11-22"],
    ["2027-01-05T12:00:00Z", "2026-12-23", "2027-01-05"],
    ["2024-03-05T12:00:00Z", "2024-02-21", "2024-03-05"],
  ])(
    "sends 14 inclusive calendar days through the existing server contract at %s",
    (instant, startDate, endDate) => {
      const now = new Date(instant);
      const request = growthPresetRequest("14", saoPauloDay(now));
      expect(request).toEqual({ startDate, endDate });
      expect(growthRange(request, now)).toMatchObject({
        startDate,
        endDate,
        rangeDays: 14,
        since: `${startDate}T00:00:00-03:00`,
      });
    },
  );

  it.each([
    ["2026-11-22T12:00:00Z", "2026-11-09", "2026-11-15"],
    ["2026-11-23T02:30:00Z", "2026-11-09", "2026-11-15"],
    ["2026-11-23T03:00:00Z", "2026-11-16", "2026-11-22"],
    ["2026-11-25T12:00:00Z", "2026-11-16", "2026-11-22"],
    ["2027-01-01T12:00:00Z", "2026-12-21", "2026-12-27"],
    ["2024-03-04T12:00:00Z", "2024-02-26", "2024-03-03"],
  ])(
    "sends the previous complete Monday–Sunday week at %s",
    (instant, startDate, endDate) => {
      const now = new Date(instant);
      const request = growthPresetRequest("last-week", saoPauloDay(now));
      expect(request).toEqual({ startDate, endDate });
      expect(growthRange(request, now)).toMatchObject({
        startDate,
        endDate,
        rangeDays: 7,
      });
    },
  );

  it("preserves the existing rolling presets and yesterday", () => {
    for (const days of [1, 7, 30, 90]) {
      expect(growthPresetRequest(String(days), "2026-11-22")).toEqual({
        rangeDays: days,
      });
    }
    expect(growthPresetRequest("yesterday", "2027-01-01")).toEqual({
      startDate: "2026-12-31",
      endDate: "2026-12-31",
    });
  });
});