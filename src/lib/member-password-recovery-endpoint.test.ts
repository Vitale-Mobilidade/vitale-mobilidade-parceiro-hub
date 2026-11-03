import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { expect, it, vi } from "vitest";
import { sendMemberRecovery } from "../../supabase/functions/_shared/member-recovery";

const backend = "https://backend.example.invalid";
const redirectTo = "https://vitalemobilidade.com/conta?modo=senha";
const link = `${backend}/auth/v1/verify?token=private-token&type=recovery&redirect_to=${encodeURIComponent(redirectTo)}`;
function harness(
  options: {
    allowed?: boolean;
    unknown?: boolean;
    providerFail?: boolean;
    invalidLink?: boolean;
    disabled?: boolean;
    limitError?: boolean;
    gateway?: boolean;
  } = {},
) {
  let handler = async (_req: Request) => new Response(null, { status: 500 });
  const send = vi
    .fn()
    .mockResolvedValue(
      new Response("{}", { status: options.providerFail ? 500 : 200 }),
    );
  const log = vi.fn();
  const rpc = vi.fn().mockResolvedValue({
    data: options.allowed ?? true,
    error: options.limitError ? { message: "private" } : null,
  });
  const generateLink = vi.fn().mockResolvedValue(
    options.unknown
      ? { data: null, error: { message: "User not found" } }
      : {
          data: {
            properties: {
              action_link: options.invalidLink
                ? "https://evil.invalid/steal"
                : link,
            },
          },
          error: null,
        },
  );
  const createClient = vi.fn(() => ({
    rpc,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { from_email: "Vitale <contato@example.invalid>" },
            error: null,
          }),
        }),
      }),
    }),
    auth: { admin: { generateLink } },
  }));
  const compiled = ts.transpileModule(
    readFileSync(
      new URL(
        "../../supabase/functions/member-password-recovery/index.ts",
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
              sendMemberRecovery: (
                input: Parameters<typeof sendMemberRecovery>[0],
              ) => sendMemberRecovery({ ...input, request: send }),
            },
    Deno: {
      serve: (next: typeof handler) => {
        handler = next;
      },
      env: {
        get: (key: string) =>
          (
            ({
              SUPABASE_URL: backend,
              SUPABASE_SERVICE_ROLE_KEY: "private-service-key",
              RESEND_API_KEY: "private-resend-key",
              ...(options.gateway
                ? { LOVABLE_API_KEY: "private-gateway-key" }
                : {}),
              ...(options.disabled
                ? { MEMBER_PASSWORD_RECOVERY_ENABLED: "false" }
                : {}),
            }) as Record<string, string>
          )[key],
      },
    },
    Request,
    Response,
    URL,
    JSON,
    Date,
    crypto,
    TextEncoder,
    Uint8Array,
    Array,
    console: { error: log },
  });
  return { handler, send, rpc, generateLink, createClient, log };
}
const post = (body: unknown) =>
  new Request("https://endpoint.example.invalid", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "192.0.2.1",
    },
    body: JSON.stringify(body),
  });
it("generates a Supabase recovery link and sends branded Portuguese mail through Resend only", async () => {
  const h = harness();
  const result = await h.handler(
    post({
      email: " READER@EXAMPLE.INVALID ",
      redirectTo: "https://evil.invalid",
      actorId: "forged",
    }),
  );
  expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ ok: true });
  expect(result.headers.get("Cache-Control")).toBe("no-store");
  expect(h.generateLink).toHaveBeenCalledWith({
    type: "recovery",
    email: "reader@example.invalid",
    options: { redirectTo },
  });
  expect(h.rpc).toHaveBeenCalledWith("member_password_recovery_budget", {
    p_email: "reader@example.invalid",
    p_fingerprint: expect.stringMatching(/^[a-f0-9]{32}$/),
  });
  expect(h.send.mock.calls[0][0]).toBe("https://api.resend.com/emails");
  const mail = JSON.parse(h.send.mock.calls[0][1].body);
  expect(mail).toMatchObject({
    from: "Vitale <contato@example.invalid>",
    to: ["reader@example.invalid"],
    subject: "Redefina sua senha na Vitale Mobilidade",
  });
  expect(mail.text).toContain(link);
  expect(mail.html).toContain("Definir nova senha");
  expect(mail.html).not.toContain("Confirm your signup");
  expect(h.log).not.toHaveBeenCalled();
});
it("reuses the configured Resend connector credentials exclusively on the server", async () => {
  const h = harness({ gateway: true });
  await h.handler(post({ email: "reader@example.invalid" }));
  const [url, request] = h.send.mock.calls[0];
  expect(url).toBe("https://connector-gateway.lovable.dev/resend/emails");
  expect(request.headers.Authorization).toBe("Bearer private-gateway-key");
  expect(request.headers["X-Connection-Api-Key"]).toBe("private-resend-key");
  expect(request.body).not.toContain("private-service-key");
});
it.each([{ unknown: true }, { providerFail: true }, { allowed: false }])(
  "does not enumerate accounts or return tokens on a silent no-op (%j)",
  async (options) => {
    const h = harness(options);
    const result = await h.handler(post({ email: "reader@example.invalid" }));
    expect(result.status).toBe(200);
    expect(await result.text()).toBe('{"ok":true}');
    if (options.unknown || options.allowed === false)
      expect(h.send).not.toHaveBeenCalled();
    if (options.allowed === false)
      expect(h.generateLink).not.toHaveBeenCalled();
    if (options.providerFail)
      expect(h.log).toHaveBeenCalledWith(
        "member_password_recovery_delivery_failed",
      );
    expect(JSON.stringify(h.log.mock.calls)).not.toContain("reader");
    expect(JSON.stringify(h.log.mock.calls)).not.toContain("token");
  },
);
it.each([{ disabled: true }, { limitError: true }, { invalidLink: true }])(
  "fails closed without sending when prerequisites fail (%j)",
  async (options) => {
    const h = harness(options);
    expect(
      (await h.handler(post({ email: "reader@example.invalid" }))).status,
    ).toBe(503);
    expect(h.send).not.toHaveBeenCalled();
  },
);
it.each([[], null, { email: "bad" }, { email: "a".repeat(255) }])(
  "rejects malformed input before budget or provider access (%j)",
  async (body) => {
    const h = harness();
    expect((await h.handler(post(body))).status).toBe(400);
    expect(h.generateLink).not.toHaveBeenCalled();
    expect(h.rpc).not.toHaveBeenCalled();
  },
);
it("GET never generates tokens; honeypots never consume quota", async () => {
  const h = harness();
  expect(
    (
      await h.handler(
        new Request("https://endpoint.example.invalid?email=secret"),
      )
    ).status,
  ).toBe(405);
  expect(
    (
      await h.handler(
        post({ email: "reader@example.invalid", website: "spam" }),
      )
    ).status,
  ).toBe(200);
  expect(h.rpc).not.toHaveBeenCalled();
  expect(h.generateLink).not.toHaveBeenCalled();
  expect(h.send).not.toHaveBeenCalled();
});
