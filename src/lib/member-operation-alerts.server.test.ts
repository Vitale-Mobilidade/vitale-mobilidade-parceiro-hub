/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ db: null as any }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => state.db }));
import {
  deliverMemberOperationAlerts,
  operationAlertMessage,
} from "./member-operation-alerts.server";
import { listingBillingWorker } from "./listing-billing.server";

const base = {
  id: "10000000-0000-4000-8000-000000000001",
  lease_token: "10000000-0000-4000-8000-000000000002",
  delivery_from: "Vitale <vitale@example.invalid>",
  delivery_to: "owner@example.invalid",
  event_kind: "registration" as const,
  payload: { name: "Pessoa <nova>", occurredAt: "2026-11-06T01:30:00+00:00" },
};
function database(rows: any[] = [base]) {
  return {
    rpc: vi.fn(async (name: string, args?: any) => ({
      data:
        name === "member_operation_alert_claim"
          ? rows
          : name === "member_operation_alert_prepare"
            ? args.p_body
            : true,
      error: null,
    })),
  } as any;
}
beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "synthetic");
  vi.stubEnv("LOVABLE_API_KEY", "");
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("administrative member alerts", () => {
  it("uses branded Portuguese messages, São Paulo dates and escapes user text", () => {
    const body = operationAlertMessage(base);
    expect(body.subject).toContain("novo cadastro");
    expect(body.text).toContain("05/11/2026, 22:30");
    expect(body.html).toContain("Pessoa &lt;nova&gt;");
    expect(body.text).toContain(
      "https://vitalemobilidade.com/admin/comunidade",
    );
    expect(body.to).toEqual(["owner@example.invalid"]);
    expect(body.cc).toEqual(["lucasvitale@hotmail.com"]);
  });
  it("includes actual paid listing and original expiry, without card or phone data", () => {
    const paid = {
      ...base,
      event_kind: "paid_listing" as const,
      payload: {
        ...base.payload,
        listingId: "20000000-0000-4000-8000-000000000001",
        title: 'Bike <script> "ótima"',
        amountCents: 15000 as const,
        paidUntil: "2027-02-04T01:30:00+00:00",
      },
    };
    const body = operationAlertMessage(paid);
    expect(body.subject).toContain("anúncio publicado");
    expect(body.cc).toEqual(["lucasvitale@hotmail.com"]);
    expect(body.text).toContain("R$150,00");
    const updatedBody = operationAlertMessage({
      ...paid,
      payload: { ...paid.payload, amountCents: 5000 },
    });
    expect(updatedBody.text).toContain("R$50,00");
    expect(body.text).toContain("03/02/2027, 22:30");
    expect(body.html).toContain("&lt;script&gt;");
    expect(body.text).toContain(
      "/venda-sua-bike/20000000-0000-4000-8000-000000000001",
    );
    expect(body.text).not.toMatch(/CPF|cartão|celular/i);
    expect(() =>
      operationAlertMessage({ ...base, event_kind: "paid_listing" }),
    ).toThrow("invalid_payload");
  });
  it("does not claim when credentials are absent", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const db = database(),
      request = vi.fn();
    expect(await deliverMemberOperationAlerts(db, request)).toEqual({
      accepted: 0,
      configured: false,
    });
    expect(db.rpc).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
  it("does not duplicate Lucas when he is the primary recipient", () => {
    const body = operationAlertMessage({
      ...base,
      delivery_to: "LUCASVITALE@HOTMAIL.COM",
    });
    expect(body.to).toEqual(["LUCASVITALE@HOTMAIL.COM"]);
    expect(body.cc).toBeUndefined();
  });
  it("sends through the existing gateway with a stable event key and acknowledges acceptance", async () => {
    vi.stubEnv("LOVABLE_API_KEY", "synthetic-gateway");
    const db = database(),
      request = vi.fn(async () => Response.json({ id: "provider-id" }));
    expect(await deliverMemberOperationAlerts(db, request)).toEqual({
      accepted: 1,
      configured: true,
    });
    expect((request.mock.calls[0] as unknown[])[0]).toBe(
      "https://connector-gateway.lovable.dev/resend/emails",
    );
    const options = (request.mock.calls[0] as any)[1];
    expect(options.headers).toMatchObject({
      Authorization: "Bearer synthetic-gateway",
      "X-Connection-Api-Key": "synthetic",
      "Idempotency-Key": `member-operation-${base.id}`,
    });
    expect(options.redirect).toBe("manual");
    expect(JSON.parse(options.body).to).toEqual([base.delivery_to]);
    expect(JSON.parse(options.body).cc).toEqual(["lucasvitale@hotmail.com"]);
    expect(db.rpc).toHaveBeenLastCalledWith("member_operation_alert_finish", {
      p_id: base.id,
      p_lease: base.lease_token,
      p_provider: "provider-id",
      p_error: null,
    });
  });
  it("keeps the same payload and key across an ambiguous network retry", async () => {
    const db = database(),
      request = vi
        .fn()
        .mockRejectedValueOnce(new Error("private provider details"))
        .mockResolvedValueOnce(Response.json({ id: "provider-id" }));
    expect((await deliverMemberOperationAlerts(db, request)).accepted).toBe(0);
    expect(db.rpc).toHaveBeenLastCalledWith(
      "member_operation_alert_finish",
      expect.objectContaining({ p_provider: null, p_error: "delivery_retry" }),
    );
    expect((await deliverMemberOperationAlerts(db, request)).accepted).toBe(1);
    expect(request.mock.calls[0][1].body).toBe(request.mock.calls[1][1].body);
    expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
      request.mock.calls[1][1].headers["Idempotency-Key"],
    );
    expect(console.error).not.toHaveBeenCalled();
  });
  it.each([429, 500, 401])(
    "does not mark HTTP %s accepted or expose provider errors",
    async (status) => {
      const db = database(),
        request = vi.fn(
          async () => new Response("private details", { status }),
        );
      expect((await deliverMemberOperationAlerts(db, request)).accepted).toBe(
        0,
      );
      expect(db.rpc).toHaveBeenLastCalledWith(
        "member_operation_alert_finish",
        expect.objectContaining({
          p_error: "delivery_retry",
          p_provider: null,
        }),
      );
    },
  );
  it("retains ambiguous success for retry when provider response has no valid id", async () => {
    const db = database();
    expect(
      (
        await deliverMemberOperationAlerts(
          db,
          vi.fn(async () => Response.json({ ok: true })),
        )
      ).accepted,
    ).toBe(0);
    expect(db.rpc).toHaveBeenLastCalledWith(
      "member_operation_alert_finish",
      expect.objectContaining({ p_error: "delivery_retry" }),
    );
  });
  it("uses the persisted request body even after a template change", async () => {
    const db = database(),
      original = JSON.stringify({
        from: base.delivery_from,
        to: [base.delivery_to],
        subject: "Versão original",
        text: "Original",
        html: "Original",
      });
    db.rpc.mockImplementation(async (name: string) => ({
      data: name.endsWith("claim")
        ? [base]
        : name.endsWith("prepare")
          ? original
          : true,
      error: null,
    }));
    const request = vi.fn(async (_url: unknown, _options: unknown) =>
      Response.json({ id: "provider-id" }),
    );
    await deliverMemberOperationAlerts(db, request);
    expect((request.mock.calls[0][1] as RequestInit).body).toBe(original);
    expect(JSON.parse(original)).not.toHaveProperty("cc");
  });
  it("mail or queue acknowledgement failure never throws into billing", async () => {
    const db = database();
    db.rpc.mockImplementation(async (name: string) =>
      name.endsWith("claim")
        ? { data: [base], error: null }
        : { data: null, error: new Error("private DB detail") },
    );
    await expect(
      deliverMemberOperationAlerts(
        db,
        vi.fn(async () => Response.json({ id: "provider-id" })),
      ),
    ).resolves.toEqual({ accepted: 0, configured: true });
    expect(console.error).toHaveBeenCalledWith(
      "[member-operation-alerts] queue_processing_failed",
    );
  });
  it("requires the existing worker signature before claiming or sending", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.invalid");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic");
    state.db = { rpc: vi.fn(async () => ({ data: false, error: null })) };
    const request = vi.fn();
    vi.stubGlobal("fetch", request);
    const result = await listingBillingWorker(
      new Request("https://test.invalid/worker", { method: "POST" }),
    );
    expect(result.status).toBe(403);
    expect(state.db.rpc).toHaveBeenCalledTimes(1);
    expect(request).not.toHaveBeenCalled();
  });
  it("sends registration alerts even when Asaas credentials are unavailable", async () => {
    vi.stubEnv("SUPABASE_URL", "https://test.invalid");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic");
    vi.stubEnv("ASAAS_API_KEY", "");
    vi.stubEnv("ASAAS_WEBHOOK_TOKEN", "");
    state.db = database();
    const request = vi.fn(async () => Response.json({ id: "provider-id" }));
    vi.stubGlobal("fetch", request);
    const result = await listingBillingWorker(
      new Request("https://test.invalid/worker", { method: "POST" }),
    );
    expect(result.status).toBe(503);
    expect(request).toHaveBeenCalledTimes(1);
    expect(state.db.rpc).toHaveBeenCalledWith(
      "member_billing_authorize",
      expect.anything(),
    );
    expect(state.db.rpc).toHaveBeenCalledWith("member_operation_alert_claim");
  });
});
