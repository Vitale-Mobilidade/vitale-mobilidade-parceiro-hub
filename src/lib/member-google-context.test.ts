import { afterEach, expect, it, vi } from "vitest";
import {
  rememberGoogleMemberContext,
  readGoogleMemberContext,
  clearGoogleMemberContext,
  googleMemberReturnHref,
} from "./member-google-context";
afterEach(() => vi.unstubAllGlobals());
it("keeps only safe short-lived navigation and invitation, without identity or credentials", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
  });
  rememberGoogleMemberContext(
    "/radar?compare=v8_pro&access_token=secret#bikes",
    "a".repeat(32),
  );
  expect(readGoogleMemberContext()).toEqual({
    returnTo: "/radar?compare=v8_pro#bikes",
    invitationCode: "a".repeat(32),
  });
  expect([...data.values()].join("")).not.toContain("secret");
  expect(googleMemberReturnHref(readGoogleMemberContext())).toContain(
    "convite=",
  );
  const key = [...data.keys()][0];
  data.set(
    key,
    JSON.stringify({
      returnTo: "//evil.invalid",
      expiresAt: Date.now() + 5000,
    }),
  );
  expect(readGoogleMemberContext().returnTo).toBe("/");
  data.set(
    key,
    JSON.stringify({ returnTo: "/conta/anuncios", expiresAt: Date.now() - 1 }),
  );
  expect(readGoogleMemberContext().returnTo).toBe("/");
  clearGoogleMemberContext();
  expect(data.size).toBe(0);
});
it("tolerates unavailable storage without unsafe redirects", () => {
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => {
        throw Error();
      },
      setItem: () => {
        throw Error();
      },
      removeItem: () => {
        throw Error();
      },
    },
  });
  expect(() => rememberGoogleMemberContext("/admin")).not.toThrow();
  expect(readGoogleMemberContext().returnTo).toBe("/");
  expect(() => clearGoogleMemberContext()).not.toThrow();
});
