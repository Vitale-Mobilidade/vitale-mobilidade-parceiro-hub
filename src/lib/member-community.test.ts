import { afterEach, describe, expect, it, vi } from "vitest";
import {
  commentBodySchema,
  displayNameSchema,
  memberError,
  memberReturnPath,
  passwordSchema,
} from "./member-community";
import { supabase } from "@/integrations/supabase/client";

describe("reader boundaries", () => {
  it.each([
    "https://evil.invalid",
    "//evil.invalid",
    "/admin",
    "/conta?token=secret",
    "/conteudos/artigo?next=//evil",
    "/conteudos/%2f%2fevil",
    null,
  ])("rejects unsafe return %s", (path) => {
    expect(memberReturnPath(path)).toBe("/conteudos");
  });
  it("preserves an article return path", () =>
    expect(memberReturnPath("/conteudos/bike-v9-max")).toBe(
      "/conteudos/bike-v9-max",
    ));
  it("rejects empty, excessive or control-character names and comments", () => {
    expect(displayNameSchema.safeParse("  ").success).toBe(false);
    expect(displayNameSchema.safeParse("Ana\nMaria").success).toBe(false);
    expect(displayNameSchema.safeParse("A".repeat(61)).success).toBe(false);
    expect(commentBodySchema.safeParse("  ").success).toBe(false);
    expect(commentBodySchema.safeParse("x".repeat(2001)).success).toBe(false);
    expect(displayNameSchema.parse("  Ana Maria  ")).toBe("Ana Maria");
  });
  it("never renders raw provider diagnostics to users", () => {
    expect(
      memberError({
        message:
          "database: private-email@example.invalid internal schema error",
      }),
    ).not.toContain("private-email");
    expect(memberError({ message: "comment_rate_limited" })).toContain(
      "um minuto",
    );
  });
  it("requires a reasonable password on signup and password update", () => {
    expect(passwordSchema.safeParse("short").success).toBe(false);
    expect(passwordSchema.safeParse("x".repeat(129)).success).toBe(false);
    expect(passwordSchema.safeParse("minha-senha-local-123").success).toBe(
      true,
    );
  });
});

vi.mock("@tanstack/react-start", () => ({
  createClientOnlyFn: (fn: unknown) => fn,
}));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});
it("does not reach the backend when the frontend feature is disabled", async () => {
  vi.stubEnv("VITE_MEMBER_ACCOUNTS_ENABLED", "false");
  vi.resetModules();
  const { memberCall } = await import("./member-community-api");
  await expect(
    memberCall("save_profile", { displayName: "Ana" }),
  ).rejects.toThrow("community_disabled");
  expect(supabase.rpc).not.toHaveBeenCalled();
});
