import { describe, expect, it, vi } from "vitest";
import { getFunnelSessionId, normalizeFunnelEvent, safePath, safeReferrer, trackQuizFunnel, FUNNEL_SESSION_KEY } from "./quiz-funnel";

const SID = "3f2b8c1e-9a4d-4b7e-8c21-0d5e6f7a8b9c";

describe("quiz funnel normalization", () => {
  it("rejects invalid session, event and steps", () => {
    expect(normalizeFunnelEvent("abc", "page_view")).toBeNull();
    expect(normalizeFunnelEvent(SID, "lead_created")).toBeNull();
    expect(normalizeFunnelEvent(SID, "question_answered", 0)).toBeNull();
    expect(normalizeFunnelEvent(SID, "question_answered", 8)).toBeNull();
    expect(normalizeFunnelEvent(SID, "question_answered", 2.5)).toBeNull();
    expect(normalizeFunnelEvent(SID, "question_answered", 7)?.step).toBe(7);
    expect(normalizeFunnelEvent(SID, "page_view", 5)?.step).toBeNull();
  });
  it("strips query strings and full referrer URLs", () => {
    expect(safePath("/escolherbike?name=Joao&phone=11999")).toBe("/escolherbike");
    expect(safePath("https://x.com/a")).toBeNull();
    expect(safeReferrer("https://www.google.com/search?q=joao")).toBe("www.google.com");
    expect(safeReferrer("nope")).toBeNull();
  });
  it("payload never contains PII fields", () => {
    const p = normalizeFunnelEvent(SID, "quiz_completed", null, { path: "/escolherbike", utm_source: "ig", ...( { name: "Ana", phone: "1199", lead_id: "x" } as object) });
    expect(Object.keys(p!).sort()).toEqual(["device", "event", "path", "referrer", "session_id", "step", "utm_campaign", "utm_content", "utm_medium", "utm_source", "utm_term"].sort());
  });
});

describe("session id and fire-and-forget", () => {
  it("persists one id per storage", () => {
    const m = new Map<string, string>();
    const s = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
    const a = getFunnelSessionId(s); expect(m.get(FUNNEL_SESSION_KEY)).toBe(a); expect(getFunnelSessionId(s)).toBe(a);
  });
  it("never throws when sender fails", () => {
    const send = vi.fn(() => Promise.reject(new Error("offline")));
    expect(() => trackQuizFunnel("page_view", null, {}, send)).not.toThrow();
    const sync = vi.fn(() => { throw new Error("boom"); });
    expect(() => trackQuizFunnel("quiz_started", null, {}, sync as never)).not.toThrow();
  });
});
