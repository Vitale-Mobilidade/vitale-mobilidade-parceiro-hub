/* eslint-disable @typescript-eslint/no-explicit-any -- Stateful database test doubles exercise persistence, filters and CAS. */
import { afterEach, expect, it, vi } from "vitest";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
import { newsletterTestDb } from "@/test/helpers/newsletter-db";
const mock = vi.hoisted(() => ({
  createClient: vi.fn(),
  writer: vi.fn(),
  validate: vi.fn(),
  call: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));
vi.mock("./newsletter-sources.server", () => ({
  automaticNewsletter: mock.writer,
  validateScheduledNewsletter: mock.validate,
}));
vi.mock("./resend-newsletter.server", () => ({
  ResendNewsletter: class {
    verifySender = mock.call;
  },
  ResendFault: class extends Error {},
}));
import { newsletterTick } from "./newsletter-service.server";
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});
async function run(clock: string, draft: any = null, mode?: string) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(clock));
  vi.stubEnv("SUPABASE_URL", "https://synthetic.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "mock");
  vi.stubEnv("RESEND_API_KEY", "mock");
  const f = newsletterTestDb({
    newsletter_settings: [
      { singleton: true, enabled: true, from_email: "mock@example.com" },
    ],
    newsletter_drafts: draft ? [{ edition_day: "2026-10-19", ...draft }] : [],
  });
  f.db.rpc = vi.fn(async (name: string) => ({
    data:
      name === "newsletter_acquire"
        ? "token"
        : name === "newsletter_next_edition_number"
          ? 4
          : true,
    error: null,
  }));
  mock.createClient.mockReturnValue(f.db);
  const response = await newsletterTick(
    new Request("https://synthetic.invalid", {
      method: "POST",
      headers: {
        "x-worker-signature": "mock",
        "x-worker-issued-at": "mock",
        ...(mode ? { "x-newsletter-mode": mode } : {}),
      },
    }),
  );
  return { ...f, response, rpc: f.db.rpc };
}
it("does not overwrite an approved dated draft or call the model", async () => {
  const { response } = await run("2026-10-18T13:00:00Z", {
    id: "draft",
    generation_mode: "agent",
  });
  expect(await response.json()).toEqual({ ok: true, draftPrepared: false });
  expect(mock.writer).not.toHaveBeenCalled();
  expect(mock.call).not.toHaveBeenCalled();
});
it("forms campaigns from the correct edited draft without generation", async () => {
  const { response, rpc } = await run("2026-10-19T09:35:00Z", {
    content: proof.content,
    fingerprint: "sources",
  });
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith(
    "newsletter_form_campaign",
    expect.objectContaining({ p_day: "2026-10-19", p_fingerprint: "sources" }),
  );
  expect(mock.writer).not.toHaveBeenCalled();
});
it("recovers a missing draft deterministically during the sending window without sending that tick", async () => {
  mock.writer.mockResolvedValue({
    content: proof.content,
    fingerprint: "safe",
  });
  const { response, rpc } = await run("2026-10-19T09:35:00Z");
  expect(await response.json()).toEqual({
    ok: true,
    draftPrepared: true,
    fallback: true,
  });
  expect(mock.writer.mock.calls[0][5]).toBe("fallback");
  expect(
    rpc.mock.calls.some((c: any) => c[0] === "newsletter_form_campaign"),
  ).toBe(false);
});
it("persists safety before the editorial upgrade and needs no provider for D-1", async () => {
  mock.writer.mockResolvedValue({
    content: proof.content,
    fingerprint: "sources",
  });
  const { response, tables, rpc } = await run("2026-10-18T13:00:00Z");
  expect(await response.json()).toEqual({
    ok: true,
    draftPrepared: true,
    fallback: false,
  });
  expect(tables.newsletter_drafts[0]).toMatchObject({
    edition_day: "2026-10-19",
    revision: 2,
    generation_mode: "agent",
  });
  expect(mock.writer).toHaveBeenCalledTimes(2);
  expect(mock.call).not.toHaveBeenCalled();
  expect(
    rpc.mock.calls.some((c: any) => c[0] === "newsletter_form_campaign"),
  ).toBe(false);
});
it("keeps operational fallback recovery free of model calls", async () => {
  mock.writer.mockResolvedValue({
    content: proof.content,
    fingerprint: "sources",
  });
  const { response } = await run(
    "2026-10-18T13:00:00Z",
    null,
    "prepare-fallback",
  );
  expect(await response.json()).toEqual({
    ok: true,
    draftPrepared: true,
    fallback: true,
  });
  expect(mock.writer).toHaveBeenCalledTimes(1);
  expect(mock.writer.mock.calls[0][5]).toBe("fallback");
});
it("replaces invalid scheduled content for delivery without disabling automation or overwriting the draft", async () => {
  mock.validate.mockRejectedValueOnce(
    new Error("newsletter_motorcycle_highlight_excluded"),
  );
  mock.writer.mockResolvedValue({
    content: proof.content,
    fingerprint: "safe",
  });
  const { response, rpc, tables } = await run("2026-10-19T09:35:00Z", {
    content: proof.content,
    fingerprint: "old",
  });
  expect(await response.json()).toEqual({ ok: true, prepared: true });
  expect(mock.writer.mock.calls[0][5]).toBe("fallback");
  expect(tables.newsletter_settings[0].enabled).toBe(true);
  expect(tables.newsletter_drafts[0].fingerprint).toBe("old");
  expect(rpc).toHaveBeenCalledWith(
    "newsletter_form_campaign",
    expect.objectContaining({ p_fingerprint: "safe" }),
  );
});
it("keeps generation recovery retryable when source service is down instead of globally pausing delivery", async () => {
  mock.validate.mockRejectedValueOnce(
    new Error("newsletter_sources_unavailable"),
  );
  mock.writer.mockRejectedValueOnce(
    new Error("newsletter_sources_unavailable"),
  );
  const { response, tables, rpc } = await run("2026-10-19T09:35:00Z", {
    content: proof.content,
    fingerprint: "old",
  });
  expect(response.status).toBe(503);
  expect(tables.newsletter_settings[0].enabled).toBe(true);
  expect(
    rpc.mock.calls.some((c: any) => c[0] === "newsletter_form_campaign"),
  ).toBe(false);
});
