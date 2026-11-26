import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { HotPipeWidget } from "@/components/site/HotPipeWidget";

it("começa fechado e com launcher compacto no SSR, sem carregar o fornecedor", () => {
  const html = renderToStaticMarkup(<HotPipeWidget />);
  expect(html).toContain('aria-label="Abrir Assistente Vitale"');
  expect(html).toContain("h-14 w-14");
  expect(html).not.toContain("<script");
  expect(html).not.toContain('aria-label="Fechar Assistente Vitale"');
});
it("suprime por 24h na sessão, inclusive remount, e expira no limite", async () => {
  vi.resetModules();
  const p = await import("./assistant-invite");
  const values = new Map<string, string>();
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  const now = 1_000_000;
  expect(p.ASSISTANT_INVITE_MS).toBe(10_000);
  expect(p.assistantInviteAllowed(storage, now)).toBe(true);
  p.dismissAssistantInvite(storage, now);
  expect(p.assistantInviteAllowed(storage, now + 1)).toBe(false);
  vi.resetModules();
  const reloaded = await import("./assistant-invite");
  expect(
    reloaded.assistantInviteAllowed(
      storage,
      now + p.ASSISTANT_INVITE_COOLDOWN_MS - 1,
    ),
  ).toBe(false);
  expect(
    reloaded.assistantInviteAllowed(
      storage,
      now + p.ASSISTANT_INVITE_COOLDOWN_MS,
    ),
  ).toBe(true);
  expect(reloaded.assistantInviteAllowed(null, now)).toBe(true);
});
it("storage bloqueado mantém supressão em memória sem quebrar o botão", async () => {
  vi.resetModules();
  const p = await import("./assistant-invite");
  const blocked = {
    getItem: () => {
      throw Error("blocked");
    },
    setItem: () => {
      throw Error("blocked");
    },
  };
  expect(p.assistantInviteAllowed(blocked, 100)).toBe(true);
  expect(() => p.dismissAssistantInvite(blocked, 100)).not.toThrow();
  expect(p.assistantInviteAllowed(blocked, 101)).toBe(false);
});
