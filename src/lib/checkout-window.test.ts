import { it, expect } from "vitest";
import {
  CHECKOUT_WINDOW_MS,
  checkoutClock,
  checkoutSecondsRemaining,
} from "./checkout-window";
it("uses a persisted ten-minute deadline across reload and background time", () => {
  const created = Date.parse("2026-11-04T20:00:00Z"),
    deadline = new Date(created + CHECKOUT_WINDOW_MS).toISOString();
  expect(checkoutClock(checkoutSecondsRemaining(deadline, created)!)).toBe(
    "10:00",
  );
  expect(
    checkoutClock(checkoutSecondsRemaining(deadline, created + 90000)!),
  ).toBe("08:30");
  expect(checkoutSecondsRemaining(deadline, created + 600001)).toBe(0);
  expect(checkoutSecondsRemaining("invalid", created)).toBeNull();
  expect(checkoutSecondsRemaining(null, created)).toBeNull();
});
