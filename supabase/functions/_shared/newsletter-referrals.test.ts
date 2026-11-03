import { describe, expect, it, vi } from "vitest";
import {
  newsletterReferral,
  sendReferralConfirmation,
} from "./newsletter-referrals";

const code = "a".repeat(32),
  token = "b".repeat(64);
const mail = {
  id: "claim-id",
  nonce: "nonce-id",
  token,
  email: "guest@example.invalid",
  from: "Vitale <newsletter@example.invalid>",
};
const pending = { kind: "pending", send: true, ...mail };
function fixture(result: unknown = pending) {
  const db = {
    rpc: vi
      .fn()
      .mockResolvedValueOnce({ data: result, error: null })
      .mockResolvedValue({ data: { kind: "recorded" }, error: null }),
  };
  const context = {
    enabled: true,
    fingerprint: "c".repeat(32),
    actorId: null as string | null,
    send: vi.fn().mockResolvedValue(undefined),
  };
  return { db, context };
}
const signup = {
  referralCode: code,
  name: "Guest",
  email: mail.email,
  consent: true,
};
describe("newsletter referrals boundary", () => {
  it("preserves ordinary signup without invoking the new database API", async () => {
    const { db, context } = fixture();
    expect(
      await newsletterReferral(
        db,
        { name: "Guest", email: mail.email, consent: true },
        context,
      ),
    ).toEqual({ handled: false });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("disabled configuration leaves signup ordinary and does not send mail", async () => {
    const { db, context } = fixture();
    context.enabled = false;
    expect(await newsletterReferral(db, signup, context)).toEqual({
      handled: false,
    });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(context.send).not.toHaveBeenCalled();
  });
  it("uses trusted actor, not client JSON; hides all private confirmation fields", async () => {
    const { db, context } = fixture();
    context.actorId = "verified-user";
    const result = await newsletterReferral(
      db,
      { ...signup, actorId: "forged-user" },
      context,
    );
    expect(db.rpc).toHaveBeenNthCalledWith(
      1,
      "newsletter_referral_service",
      expect.objectContaining({
        p_action: "register",
        p_payload: expect.objectContaining({ actorId: "verified-user" }),
      }),
    );
    expect(context.send).toHaveBeenCalledWith(pending);
    expect(result).toEqual({
      handled: true,
      status: 200,
      body: { ok: true, confirmationRequired: true },
    });
    expect(JSON.stringify(result)).not.toContain(token);
    expect(JSON.stringify(result)).not.toContain(mail.email);
    expect(db.rpc).toHaveBeenNthCalledWith(2, "newsletter_referral_service", {
      p_action: "mail_result",
      p_payload: { id: mail.id, nonce: mail.nonce, sent: true },
    });
  });
  it("identical success for self/existing/duplicate without mail", async () => {
    const { db, context } = fixture({ kind: "pending", send: false });
    expect(await newsletterReferral(db, signup, context)).toEqual({
      handled: true,
      status: 200,
      body: { ok: true, confirmationRequired: true },
    });
    expect(context.send).not.toHaveBeenCalled();
  });
  it.each(["disabled", "unattributed"])(
    "%s falls back to existing signup",
    async (kind) => {
      const { db, context } = fixture({ kind });
      expect(await newsletterReferral(db, signup, context)).toEqual({
        handled: false,
      });
      expect(context.send).not.toHaveBeenCalled();
    },
  );
  it("reports provider failure, records a safe failure and does not activate a subscription", async () => {
    const { db, context } = fixture();
    context.send.mockRejectedValue(new Error("secret-provider-diagnostic"));
    expect(await newsletterReferral(db, signup, context)).toEqual({
      handled: true,
      status: 503,
      body: { ok: false, error: "referral_unavailable" },
    });
    expect(db.rpc).toHaveBeenLastCalledWith("newsletter_referral_service", {
      p_action: "mail_result",
      p_payload: { id: mail.id, nonce: mail.nonce, sent: false },
    });
    expect(
      db.rpc.mock.calls.every((call) => call[1].p_action !== "confirm"),
    ).toBe(true);
  });
  it("does not say a failed pending mail has been sent on immediate retry", async () => {
    const { db, context } = fixture({
      kind: "pending",
      send: false,
      retryFailed: true,
    });
    expect(await newsletterReferral(db, signup, context)).toMatchObject({
      status: 503,
    });
  });
  it.each(["confirmation_invalid", "confirmation_expired"])(
    "returns actionable %s without raw provider details",
    async (message) => {
      const { db, context } = fixture();
      db.rpc.mockReset().mockResolvedValue({ data: null, error: { message } });
      expect(
        await newsletterReferral(
          db,
          { action: "confirm_referral", token },
          context,
        ),
      ).toMatchObject({ status: 400, body: { error: message } });
    },
  );
  it("does not send malformed tokens or arbitrary code URLs to the database", async () => {
    const { db, context } = fixture();
    expect(
      await newsletterReferral(
        db,
        { action: "confirm_referral", token: "https://evil.invalid" },
        context,
      ),
    ).toMatchObject({ status: 400 });
    expect(
      await newsletterReferral(
        db,
        { ...signup, referralCode: "//evil.invalid" },
        context,
      ),
    ).toEqual({ handled: false });
    expect(db.rpc).not.toHaveBeenCalled();
  });
  it("confirms only via the explicit action and never sends another email", async () => {
    const { db, context } = fixture({ kind: "confirmed" });
    expect(
      await newsletterReferral(
        db,
        { action: "confirm_referral", token },
        context,
      ),
    ).toEqual({ handled: true, status: 200, body: { ok: true } });
    expect(context.send).not.toHaveBeenCalled();
  });
  it("records a visit independently of signup", async () => {
    const { db, context } = fixture({ kind: "recorded" });
    expect(
      await newsletterReferral(
        db,
        { action: "referral_visit", referralCode: code },
        context,
      ),
    ).toMatchObject({ body: { ok: true } });
    expect(db.rpc).toHaveBeenCalledWith(
      "newsletter_referral_service",
      expect.objectContaining({ p_action: "visit" }),
    );
    expect(context.send).not.toHaveBeenCalled();
  });
  it("provider request uses same accepted gateway and deterministic idempotency key", async () => {
    const send = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    await sendReferralConfirmation(
      mail,
      { apiKey: "local-key", gatewayKey: "local-gateway" },
      send,
    );
    expect(send).toHaveBeenCalledTimes(1);
    const [url, request] = send.mock.calls[0];
    expect(url).toBe("https://connector-gateway.lovable.dev/resend/emails");
    expect(request.headers["Idempotency-Key"]).toBe(
      "newsletter-referral-claim-id-nonce-id",
    );
    const body = JSON.parse(request.body);
    expect(body.to).toEqual([mail.email]);
    expect(body.text).toContain(`/newsletter/confirmar#token=${token}`);
    expect(body.text).not.toContain("?token=");
  });
  it("no configuration means no provider call", async () => {
    const send = vi.fn();
    await expect(sendReferralConfirmation(mail, {}, send)).rejects.toThrow(
      "referral_mail_unavailable",
    );
    expect(send).not.toHaveBeenCalled();
  });
});
