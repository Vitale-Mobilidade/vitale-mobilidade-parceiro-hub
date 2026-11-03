// Shared, dependency-injected contract: no provider calls at import time.
export const REFERRAL_CODE = /^[a-f0-9]{32}$/;
const CONFIRMATION_TOKEN = /^[a-f0-9]{64}$/;
type Database = {
  rpc: (
    name: string,
    args: Record<string, unknown>,
  ) => PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
type Context = {
  enabled: boolean;
  fingerprint: string;
  actorId: string | null;
  send: (mail: {
    id: string;
    nonce: string;
    token: string;
    email: string;
    from: string;
  }) => Promise<void>;
};
type Result =
  | { handled: false }
  | { handled: true; status: number; body: Record<string, unknown> };
const response = (body: Record<string, unknown>, status = 200): Result => ({
  handled: true,
  body,
  status,
});

export async function newsletterReferral(
  db: Database,
  body: Record<string, unknown>,
  context: Context,
): Promise<Result> {
  const confirm = body.action === "confirm_referral";
  const visit = body.action === "referral_visit";
  const code =
    typeof body.referralCode === "string" &&
    REFERRAL_CODE.test(body.referralCode)
      ? body.referralCode
      : null;
  if (!confirm && !visit && !code) return { handled: false };
  if (!context.enabled)
    return confirm
      ? response({ ok: false, error: "referral_unavailable" }, 503)
      : visit
        ? response({ ok: true })
        : { handled: false };
  if (
    confirm &&
    (typeof body.token !== "string" || !CONFIRMATION_TOKEN.test(body.token))
  )
    return response({ ok: false, error: "confirmation_invalid" }, 400);
  if (visit && !code) return response({ ok: true });
  const { data, error } = await db.rpc("newsletter_referral_service", {
    p_action: confirm ? "confirm" : visit ? "visit" : "register",
    p_payload: confirm
      ? {
          token: body.token,
          fingerprint: context.fingerprint,
          actorId: context.actorId,
        }
      : {
          code,
          fingerprint: context.fingerprint,
          actorId: context.actorId,
          ...(visit
            ? {}
            : { name: body.name, email: body.email, consent: body.consent }),
        },
  });
  if (error) {
    const expected = ["confirmation_invalid", "confirmation_expired"].includes(
      error.message,
    );
    return response(
      { ok: false, error: expected ? error.message : "referral_unavailable" },
      expected
        ? 400
        : error.message === "referral_mail_limit" ||
            error.message === "referral_rate_limited"
          ? 429
          : 503,
    );
  }
  const value = data as Record<string, unknown> | null;
  if (!value || typeof value.kind !== "string")
    return response({ ok: false, error: "referral_unavailable" }, 503);
  if (value.kind === "invalid" || value.kind === "expired")
    return response(
      {
        ok: false,
        error:
          value.kind === "expired"
            ? "confirmation_expired"
            : "confirmation_invalid",
      },
      400,
    );
  if (value.kind === "rate_limited")
    return response({ ok: false, error: "referral_unavailable" }, 429);
  if (value.kind === "disabled" || value.kind === "unattributed") {
    if (confirm)
      return response({ ok: false, error: "referral_unavailable" }, 503);
    return visit ? response({ ok: true }) : { handled: false };
  }
  if (confirm)
    return value.kind === "confirmed"
      ? response({ ok: true })
      : response({ ok: false, error: "confirmation_invalid" }, 400);
  if (visit) return response({ ok: true });
  if (value.kind !== "pending")
    return response({ ok: false, error: "referral_unavailable" }, 503);
  if (value.retryFailed === true)
    return response({ ok: false, error: "referral_unavailable" }, 503);
  if (value.send === true) {
    const fields = ["id", "nonce", "token", "email", "from"] as const;
    if (
      fields.some((field) => typeof value[field] !== "string") ||
      !CONFIRMATION_TOKEN.test(String(value.token))
    )
      return response({ ok: false, error: "referral_unavailable" }, 503);
    let sent = false;
    try {
      await context.send(
        value as {
          id: string;
          nonce: string;
          token: string;
          email: string;
          from: string;
        },
      );
      sent = true;
    } catch {
      /* Never log recipients, links, tokens or provider payloads. */
    }
    const recorded = await db.rpc("newsletter_referral_service", {
      p_action: "mail_result",
      p_payload: { id: value.id, nonce: value.nonce, sent },
    });
    if (!sent || recorded.error)
      return response({ ok: false, error: "referral_unavailable" }, 503);
  }
  // Identical response for existing, self, duplicate and new addresses.
  // Tokens/recipient data returned by the private RPC never reach the browser.
  return response({ ok: true, confirmationRequired: true });
}

export async function sendReferralConfirmation(
  mail: {
    id: string;
    nonce: string;
    token: string;
    email: string;
    from: string;
  },
  config: { apiKey?: string; gatewayKey?: string },
  send: typeof fetch = fetch,
) {
  if (!config.apiKey || !mail.from || !CONFIRMATION_TOKEN.test(mail.token))
    throw new Error("referral_mail_unavailable");
  const url = `https://vitalemobilidade.com/newsletter/confirmar#token=${mail.token}`;
  const result = await send(
    config.gatewayKey
      ? "https://connector-gateway.lovable.dev/resend/emails"
      : "https://api.resend.com/emails",
    {
      method: "POST",
      redirect: "manual",
      signal: AbortSignal.timeout(12_000),
      headers: {
        Authorization: `Bearer ${config.gatewayKey ?? config.apiKey}`,
        ...(config.gatewayKey ? { "X-Connection-Api-Key": config.apiKey } : {}),
        "Content-Type": "application/json",
        "Idempotency-Key": `newsletter-referral-${mail.id}-${mail.nonce}`,
      },
      body: JSON.stringify({
        from: mail.from,
        to: [mail.email],
        subject: "Confirme sua inscrição na newsletter Vitale",
        text: `Você pediu para receber a newsletter gratuita da Vitale Mobilidade por um convite.\n\nPara confirmar seu e-mail e sua inscrição, abra o link e escolha Confirmar inscrição:\n${url}\n\nO link vale por 48 horas. Se não foi você, ignore esta mensagem. Sua inscrição não será ativada por este pedido.\n\nVitale Mobilidade\nhttps://vitalemobilidade.com/privacidade`,
      }),
    },
  );
  if (!result.ok) throw new Error("referral_mail_failed");
}
