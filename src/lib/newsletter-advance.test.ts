import { afterEach, expect, it, vi } from "vitest";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
const mock = vi.hoisted(() => ({
  createClient: vi.fn(),
  writer: vi.fn(),
  call: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mock.createClient }));
vi.mock("./newsletter-sources.server", () => ({
  automaticNewsletter: mock.writer,
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
async function run(clock: string, draft: unknown) {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(clock));
  vi.stubEnv("SUPABASE_URL", "https://synthetic.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "mock");
  vi.stubEnv("RESEND_API_KEY", "mock");
  const inserts = vi.fn().mockResolvedValue({ data: null, error: null });
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "newsletter_authorize" || name === "newsletter_renew"
        ? true
        : "token",
    error: null,
  }));
  const from = vi.fn((table: string) => {
    const data =
      table === "newsletter_settings"
        ? { enabled: true, from_email: "mock@example.com" }
        : table === "newsletter_drafts"
          ? draft
          : [];
    const q: any = {
      then: (resolve: any) =>
        Promise.resolve({ data, error: null }).then(resolve),
      single: async () => ({ data, error: null }),
      maybeSingle: async () => ({ data, error: null }),
      insert: inserts,
      upsert: () => q,
    };
    for (const method of [
      "select",
      "eq",
      "in",
      "order",
      "limit",
      "update",
      "range",
      "lt",
    ])
      q[method] = () => q;
    return q;
  });
  mock.createClient.mockReturnValue({ from, rpc });
  const response = await newsletterTick(
    new Request("https://synthetic.invalid", {
      method: "POST",
      headers: { "x-worker-signature": "mock", "x-worker-issued-at": "mock" },
    }),
  );
  return { response, rpc, inserts };
}
it("reuses Sunday's saved draft without another generation", async () => {
  const { response, inserts } = await run("2026-10-11T13:00:00Z", {
    id: "draft",
  });
  expect(await response.json()).toEqual({ ok: true, draftPrepared: false });
  expect(mock.writer).not.toHaveBeenCalled();
  expect(inserts).not.toHaveBeenCalled();
});
it("sends the edited draft for the correct date without calling the writer", async () => {
  const content = {
    ...proof.content,
    subject: "#2 — Minhas alterações para esta edição",
  };
  const { response, rpc } = await run("2026-10-12T09:35:00Z", {
    content,
    fingerprint: "sources",
  });
  expect(response.status).toBe(200);
  expect(rpc).toHaveBeenCalledWith(
    "newsletter_form_campaign",
    expect.objectContaining({
      p_day: "2026-10-12",
      p_payload: { content },
      p_fingerprint: "sources",
    }),
  );
  expect(mock.writer).not.toHaveBeenCalled();
});
it("recovers a missing draft during the sending window without sending that tick", async () => {
  mock.writer.mockResolvedValueOnce({
    content: proof.content,
    fingerprint: "sources",
  });
  const { response, rpc } = await run("2026-10-12T09:35:00Z", null);
  expect(await response.json()).toEqual({
    ok: true,
    draftPrepared: true,
    fallback: true,
  });
  expect(rpc.mock.calls.some((c) => c[0] === "newsletter_form_campaign")).toBe(
    false,
  );
  expect(mock.writer).toHaveBeenCalledWith(
    1,
    undefined,
    [],
    "token",
    undefined,
    "fallback",
  );
});

it("prepares exactly the next dated draft without creating or sending campaigns", async () => {
  mock.writer.mockResolvedValueOnce({
    content: proof.content,
    fingerprint: "sources",
  });
  const { response, rpc, inserts } = await run("2026-10-11T13:00:00Z", null);
  expect(await response.json()).toEqual({
    ok: true,
    draftPrepared: true,
    fallback: false,
  });
  expect(mock.writer).toHaveBeenCalledTimes(1);
  expect(inserts).toHaveBeenCalledWith({
    content: proof.content,
    fingerprint: "sources",
    edition_day: "2026-10-12",
    origin: "agent",
    generation_mode: "agent",
    edited_by: null,
  });
  expect(rpc.mock.calls.some((c) => c[0] === "newsletter_form_campaign")).toBe(
    false,
  );
});
