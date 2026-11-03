import { afterEach, expect, it, vi } from "vitest";
import { memberLoginHref, memberReturnPath } from "./member-community";
import {
  clearMemberReturn,
  rememberMemberReturn,
  rememberedMemberReturn,
} from "./member-auth-return";
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it.each([
  "/",
  "/radar/v9_max",
  "/conteudos",
  "/newsletter",
  "/ferramentas/carro-vs-bike",
  "/conta/anuncios",
  "/radar?compare=v9_max%2Cv8_pro#bikes",
])("preserves an internal origin %s", (path) =>
  expect(memberReturnPath(path)).toBe(path),
);
it.each([
  "//evil.invalid",
  "/\\evil.invalid",
  "/conta?modo=senha",
  "/admin",
  "/radar/%2f%2fevil",
  "https://vitalemobilidade.com/radar",
  "/radar\n/evil",
])("rejects an unsafe origin %s", (path) =>
  expect(memberReturnPath(path)).toBe("/"),
);
it("drops credentials and redirect parameters from origins", () => {
  expect(
    memberReturnPath(
      "/radar?access_token=secret&next=//evil&q=bike#access_token=secret",
    ),
  ).toBe("/radar?q=bike");
  expect(memberLoginHref("/conta/anuncios")).toBe(
    "/conta?retorno=%2Fconta%2Fanuncios",
  );
});
it("keeps recovery navigation context only for thirty minutes and tolerates unavailable storage", () => {
  const data = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => data.set(k, v),
      removeItem: (k: string) => data.delete(k),
    },
  });
  rememberMemberReturn("/radar?access_token=secret#bikes");
  expect(rememberedMemberReturn("/")).toBe("/radar#bikes");
  expect([...data.values()].join("")).not.toContain("secret");
  vi.spyOn(Date, "now").mockReturnValue(Date.now() + 31 * 60 * 1000);
  expect(rememberedMemberReturn("/conteudos")).toBe("/conteudos");
  clearMemberReturn();
  expect(data.size).toBe(0);
  vi.stubGlobal("window", {
    localStorage: {
      getItem: () => {
        throw Error("denied");
      },
      setItem: () => {
        throw Error("denied");
      },
    },
  });
  expect(() => rememberMemberReturn("/radar")).not.toThrow();
  expect(rememberedMemberReturn("/radar")).toBe("/radar");
});
