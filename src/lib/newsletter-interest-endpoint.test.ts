import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { newsletterReferral } from "../../supabase/functions/_shared/newsletter-referrals";

function harness(
  enabled = true,
  result: unknown = { kind: "pending", send: false },
) {
  let handler: (req: Request) => Promise<Response> = async () =>
    new Response(null, { status: 500 });
  const subscribe = vi.fn().mockResolvedValue({ error: null });
  const throttle = vi.fn().mockResolvedValue({ error: null });
  const rpc = vi.fn().mockResolvedValue({ data: result, error: null });
  const send = vi.fn().mockResolvedValue(undefined);
  const getUser = vi.fn().mockResolvedValue({
    data: { user: { id: "00000000-0000-4000-8000-000000000002" } },
    error: null,
  });
  const db = {
    rpc,
    auth: { getUser },
    from: (name: string) =>
      name === "newsletter_throttle"
        ? {
            select: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
            upsert: throttle,
          }
        : { upsert: subscribe },
  };
  const compiled = ts.transpileModule(
    readFileSync(
      new URL(
        "../../supabase/functions/newsletter-interest/index.ts",
        import.meta.url,
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  runInNewContext(compiled, {
    exports: {},
    require: (name: string) =>
      name.endsWith("/cors")
        ? { corsHeaders: { "Access-Control-Allow-Origin": "*" } }
        : name.startsWith("npm:")
          ? { createClient: () => db }
          : { newsletterReferral, sendReferralConfirmation: send },
    Deno: {
      env: {
        get: (key: string) =>
          key === "NEWSLETTER_REFERRALS_ENABLED"
            ? String(enabled)
            : key === "SUPABASE_ANON_KEY"
              ? "local-anon"
              : "local-only",
      },
      serve: (next: typeof handler) => {
        handler = next;
      },
    },
    Response,
    Request,
    JSON,
    Date,
    crypto,
    TextEncoder,
    Uint8Array,
    Array,
  });
  return { handler, subscribe, throttle, rpc, send, getUser };
}
const code = "a".repeat(32);
const input = {
  name: "Guest",
  email: " GUEST@EXAMPLE.INVALID ",
  consent: true,
  interest: "general",
  website: "",
};
const post = (body: unknown, authenticated = false) =>
  new Request("https://function.example.invalid", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(authenticated ? { authorization: "Bearer a.b.c" } : {}),
    },
    body: JSON.stringify(body),
  });
it("ordinary newsletter keeps its existing normalized writer and no referral calls", async () => {
  const h = harness();
  const response = await h.handler(post(input));
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(h.subscribe).toHaveBeenCalledWith(
    expect.objectContaining({
      person_name: "Guest",
      email: "guest@example.invalid",
      consent_version: "v2",
      interest: "general",
    }),
    { onConflict: "email" },
  );
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
it("disabled referrals still accept ordinary newsletter signup", async () => {
  const h = harness(false);
  expect((await h.handler(post({ ...input, referralCode: code }))).status).toBe(
    200,
  );
  expect(h.subscribe).toHaveBeenCalledTimes(1);
  expect(h.rpc).not.toHaveBeenCalled();
});
it("referred pending signup does not enter the campaign writer or leak private fields", async () => {
  const h = harness(true, {
    kind: "pending",
    send: true,
    id: "id",
    nonce: "nonce",
    token: "b".repeat(64),
    email: "guest@example.invalid",
    from: "newsletter@example.invalid",
  });
  const result = await h.handler(post({ ...input, referralCode: code }));
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ ok: true, confirmationRequired: true });
  expect(h.subscribe).not.toHaveBeenCalled();
  expect(h.send).toHaveBeenCalledTimes(1);
});
it("requires newsletter consent even when a referral code is present", async () => {
  const h = harness();
  expect(
    (await h.handler(post({ ...input, consent: false, referralCode: code })))
      .status,
  ).toBe(400);
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
it("ignores forged identity and uses verified Auth identity", async () => {
  const h = harness();
  await h.handler(
    post({ ...input, referralCode: code, actorId: "forged" }, true),
  );
  expect(h.getUser).toHaveBeenCalledWith("a.b.c");
  expect(h.rpc).toHaveBeenCalledWith(
    "newsletter_referral_service",
    expect.objectContaining({
      p_payload: expect.objectContaining({
        actorId: "00000000-0000-4000-8000-000000000002",
      }),
    }),
  );
});
it("visit needs no mailbox or consent and never subscribes or sends", async () => {
  const h = harness(true, { kind: "recorded" });
  expect(
    (await h.handler(post({ action: "referral_visit", referralCode: code })))
      .status,
  ).toBe(200);
  expect(h.rpc).toHaveBeenCalledWith(
    "newsletter_referral_service",
    expect.objectContaining({ p_action: "visit" }),
  );
  expect(h.subscribe).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
it("confirmation is POST only and does not expose the raw token in success", async () => {
  const h = harness(true, { kind: "confirmed" });
  expect(
    (
      await h.handler(
        new Request("https://function.example.invalid?token=secret"),
      )
    ).status,
  ).toBe(405);
  expect(h.rpc).not.toHaveBeenCalled();
  const result = await h.handler(
    post({ action: "confirm_referral", token: "b".repeat(64) }),
  );
  expect(await result.json()).toEqual({ ok: true });
  expect(h.subscribe).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
it("rejects malformed JSON shapes and bots before any provider request", async () => {
  const h = harness();
  expect((await h.handler(post([]))).status).toBe(400);
  expect(
    (await h.handler(post({ ...input, referralCode: code, website: "spam" })))
      .status,
  ).toBe(200);
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.subscribe).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
