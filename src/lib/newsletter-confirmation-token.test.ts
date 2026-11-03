import { isMemberPrivatePath } from "./member-private-path";
import { afterEach, expect, it, vi } from "vitest";
import {
  forgetNewsletterConfirmationToken,
  takeNewsletterConfirmationToken,
} from "./newsletter-confirmation-token";
afterEach(() => {
  forgetNewsletterConfirmationToken();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
function browser(hash = `#token=${"a".repeat(64)}`) {
  const location = { hash, pathname: "/newsletter/confirmar" };
  const replaceState = vi.fn(() => {
    location.hash = "";
  });
  vi.stubGlobal("window", { location, history: { state: {}, replaceState } });
  return { location, replaceState };
}
it("removes the bearer from the URL and survives a route remount without browser storage", () => {
  const { replaceState } = browser();
  expect(takeNewsletterConfirmationToken()).toBe("a".repeat(64));
  expect(takeNewsletterConfirmationToken()).toBe("a".repeat(64));
  expect(replaceState).toHaveBeenCalledTimes(1);
  forgetNewsletterConfirmationToken();
  expect(takeNewsletterConfirmationToken()).toBeNull();
});
it("expires the temporary in-memory handoff after five minutes", () => {
  vi.useFakeTimers();
  browser();
  expect(takeNewsletterConfirmationToken()).not.toBeNull();
  vi.advanceTimersByTime(5 * 60_000 + 1);
  expect(takeNewsletterConfirmationToken()).toBeNull();
});
it("an explicit invalid fragment cannot reuse a previous token", () => {
  const { location } = browser();
  takeNewsletterConfirmationToken();
  location.hash = "#token=malformed";
  expect(takeNewsletterConfirmationToken()).toBeNull();
});
it("never captures state during SSR", () => {
  expect(takeNewsletterConfirmationToken()).toBeNull();
});

it.each([
  "/conta",
  "/conta/",
  "/newsletter/confirmar",
  "/newsletter/confirmar/",
  "/newsletter/confirmar//",
])("keeps private path %s outside tracking", (path) =>
  expect(isMemberPrivatePath(path)).toBe(true),
);
it("newsletter invitation remains a public page", () =>
  expect(isMemberPrivatePath("/newsletter")).toBe(false));
