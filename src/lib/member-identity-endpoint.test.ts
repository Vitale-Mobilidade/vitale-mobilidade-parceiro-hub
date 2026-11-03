import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import {
  sendMemberIdentityEmail,
  sendMemberIdentityWhatsApp,
} from "../../supabase/functions/_shared/member-identity-delivery";
const actor = "00000000-0000-4000-8000-000000000013";
const id = "20000000-0000-4000-8000-000000000001";
const template = "30000000-0000-4000-8000-000000000001";
function harness(
  options: {
    phone?: boolean;
    unauthorized?: boolean;
    missingConfig?: boolean;
    rateLimited?: boolean;
    providerFail?: boolean;
    badAck?: boolean;
  } = {},
) {
  let handler = async (_req: Request) => new Response(null, { status: 500 });
  const rpc = vi.fn().mockImplementation(async (_name, args) =>
    args.p_action === "start"
      ? {
          data: options.rateLimited
            ? { ok: false, error: "identity_rate_limited" }
            : {
                ok: true,
                id,
                code: "654321",
                destination: options.phone
                  ? "+5511999999999"
                  : "owner@example.invalid",
              },
          error: null,
        }
      : { data: { ok: true }, error: null },
  );
  const getUser = vi
    .fn()
    .mockResolvedValue(
      options.unauthorized
        ? { data: { user: null }, error: { message: "invalid" } }
        : { data: { user: { id: actor, is_anonymous: false } }, error: null },
    );
  const send = vi.fn().mockImplementation(
    async () =>
      new Response(
        JSON.stringify({
          ok: true,
          code: "sent",
          provider_message_id: "wamid.local",
          phone: options.badAck ? "wrong" : "5511999999999",
          template: { template_id: template },
        }),
        { status: options.providerFail ? 500 : 200 },
      ),
  );
  const createClient = () => ({
    rpc,
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { from_email: "Vitale <vitale@example.invalid>" },
            error: null,
          }),
        }),
      }),
    }),
  });
  const env: Record<string, string> = {
    SUPABASE_URL: "https://backend.example.invalid",
    SUPABASE_SERVICE_ROLE_KEY: "private-service",
    RESEND_API_KEY: "private-resend",
    LOVABLE_API_KEY: "private-gateway",
    ...(!options.missingConfig
      ? {
          HOTPIPE_IDENTITY_API_KEY: "hp_" + "a".repeat(48),
          HOTPIPE_IDENTITY_TEMPLATE_ID: template,
          HOTPIPE_IDENTITY_CODE_VARIABLES: "code,button_0",
        }
      : {}),
  };
  const compiled = ts.transpileModule(
    readFileSync(
      new URL(
        "../../supabase/functions/member-identity-code/index.ts",
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
          ? { createClient }
          : {
              sendMemberIdentityEmail: (
                input: Parameters<typeof sendMemberIdentityEmail>[0],
              ) => sendMemberIdentityEmail({ ...input, request: send }),
              sendMemberIdentityWhatsApp: (
                input: Parameters<typeof sendMemberIdentityWhatsApp>[0],
              ) => sendMemberIdentityWhatsApp({ ...input, request: send }),
            },
    Deno: {
      serve: (next: typeof handler) => {
        handler = next;
      },
      env: { get: (key: string) => env[key] },
    },
    Request,
    Response,
    JSON,
    crypto,
    TextEncoder,
    Uint8Array,
    Array,
    Date,
  });
  return { handler, rpc, getUser, send };
}
const post = (body: unknown, token = true) =>
  new Request("https://endpoint.example.invalid", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { Authorization: "Bearer a.b.c" } : {}),
    },
    body: JSON.stringify(body),
  });
it("email code uses verified actor and server destination; response never leaks code or token", async () => {
  const h = harness();
  const response = await h.handler(
    post({
      channel: "email",
      actorId: "forged",
      destination: "attacker@example.invalid",
    }),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(h.rpc.mock.calls[0][1].p_actor).toBe(actor);
  expect(h.getUser).toHaveBeenCalledWith("a.b.c");
  expect(h.send.mock.calls[0][0]).toBe(
    "https://connector-gateway.lovable.dev/resend/emails",
  );
  const mail = JSON.parse(h.send.mock.calls[0][1].body);
  expect(mail.to).toEqual(["owner@example.invalid"]);
  expect(mail.text).toContain("654321");
  expect(h.rpc.mock.calls[1][1]).toEqual({
    p_action: "delivered",
    p_actor: actor,
    p_payload: { channel: "email", id },
  });
});
it("WhatsApp uses dedicated key, server template, exact variables and stable idempotency", async () => {
  const h = harness({ phone: true });
  const response = await h.handler(
    post({
      channel: "phone",
      phone: "+5511999999999",
      consent: true,
      template_id: "forged",
    }),
  );
  expect(response.status).toBe(200);
  const [url, request] = h.send.mock.calls[0];
  expect(url).toBe(
    "https://smixxobbszyxqauysvor.supabase.co/functions/v1/api-template-send",
  );
  expect(request.headers["Idempotency-Key"]).toBe(`vitale-identity-${id}`);
  expect(JSON.parse(request.body)).toEqual({
    template_id: template,
    to: { phone: "5511999999999" },
    variables: { code: "654321", button_0: "654321" },
  });
  expect(request.headers["x-api-key"]).toBe("hp_" + "a".repeat(48));
  expect(await response.text()).not.toContain("654321");
});
it.each([{ unauthorized: true }, {}])(
  "missing or invalid JWT never allocates or sends a code (%j)",
  async (options) => {
    const h = harness(options);
    const r = await h.handler(
      post({ channel: "email" }, Boolean(options.unauthorized)),
    );
    expect(r.status).toBe(401);
    expect(h.rpc).not.toHaveBeenCalled();
    expect(h.send).not.toHaveBeenCalled();
  },
);
it("missing dedicated Hotpipe configuration fails closed before budget allocation", async () => {
  const h = harness({ phone: true, missingConfig: true });
  expect(
    (
      await h.handler(
        post({ channel: "phone", phone: "+5511999999999", consent: true }),
      )
    ).status,
  ).toBe(503);
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
it("rate limiting never sends and returns only the public error code", async () => {
  const h = harness({ rateLimited: true });
  const r = await h.handler(post({ channel: "email" }));
  expect(r.status).toBe(429);
  expect(await r.json()).toEqual({ ok: false, error: "identity_rate_limited" });
  expect(h.send).not.toHaveBeenCalled();
});
it.each([{ providerFail: true }, { phone: true, badAck: true }])(
  "provider failure/mismatched ACK never marks delivery (%j)",
  async (options) => {
    const h = harness(options);
    const r = await h.handler(
      post({
        channel: options.phone ? "phone" : "email",
        phone: "+5511999999999",
        consent: true,
      }),
    );
    expect(r.status).toBe(503);
    expect(h.rpc).toHaveBeenCalledTimes(1);
    expect(await r.text()).not.toContain("654321");
  },
);
it.each([null, [], { channel: "sms" }, { email: "mail@example.invalid" }])(
  "invalid request creates no challenge (%j)",
  async (body) => {
    const h = harness();
    expect((await h.handler(post(body))).status).toBe(400);
    expect(h.rpc).not.toHaveBeenCalled();
  },
);
it("GET never changes identity or sends a code", async () => {
  const h = harness();
  expect(
    (await h.handler(new Request("https://endpoint.example.invalid"))).status,
  ).toBe(405);
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
