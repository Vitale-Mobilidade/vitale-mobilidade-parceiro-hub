/* eslint-disable @typescript-eslint/no-explicit-any */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AsaasClient } from "./asaas.server";
const state = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: state.from,
    rpc: state.rpc,
    auth: { getUser: state.getUser },
  }),
}));
import {
  asaasListingWebhook,
  cancelOrder,
  memberListingBilling,
  reconcileEvent,
  reconcilePayment,
  validAsaasWebhookToken,
  type BillingOrder,
} from "./listing-billing.server";
const id = "10000000-0000-4000-8000-000000000001";
const owner = "00000000-0000-4000-8000-000000000090";
const order = {
  id,
  user_id: owner,
  listing_id: "20000000-0000-4000-8000-000000000001",
  method: "card",
  status: "active",
  customer_id: "cus_test",
  subscription_id: "sub_test",
  authorization_id: null,
  financial_started: true,
  lease_token: "lease-test",
  attempts: 1,
} as BillingOrder;
const writes: any[] = [];
function chain(table: string, value: unknown) {
  const x: any = {};
  for (const name of [
    "select",
    "eq",
    "order",
    "limit",
    "maybeSingle",
    "single",
    "update",
    "upsert",
  ])
    x[name] = vi.fn((...args: any[]) => {
      if (["update", "upsert"].includes(name))
        writes.push({ table, action: name, value: args[0] });
      return x;
    });
  x.then = (resolve: any) =>
    Promise.resolve({ data: value, error: null }).then(resolve);
  return x;
}
const db = () => ({ from: state.from, rpc: state.rpc }) as any;
const api = (routes: Record<string, unknown>) =>
  new AsaasClient(
    "test-only",
    "sandbox",
    vi.fn(async (input) => {
      const path = String(input).replace(
        "https://api-sandbox.asaas.com/v3",
        "",
      );
      if (!(path in routes)) throw Error(`unexpected provider request ${path}`);
      return Response.json(routes[path]);
    }),
  );
function webhook(body: unknown, token = "t".repeat(64)) {
  return new Request("https://vitale.invalid/api/public/asaas-webhook", {
    method: "POST",
    headers: { "asaas-access-token": token },
    body: JSON.stringify(body),
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  writes.length = 0;
  process.env.SUPABASE_URL = "http://127.0.0.1:54321";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";
  process.env.ASAAS_WEBHOOK_TOKEN = "t".repeat(64);
  state.rpc.mockResolvedValue({ data: null, error: null });
  state.from.mockImplementation((t) => chain(t, order));
});
describe("authenticated billing boundary", () => {
  it("rejects false/missing webhook tokens without touching the database", async () => {
    expect(validAsaasWebhookToken("short", "short")).toBe(false);
    expect(
      (
        await asaasListingWebhook(
          webhook(
            {
              id: "evt_test",
              event: "PAYMENT_RECEIVED",
              payment: { id: "pay_test" },
            },
            "false",
          ),
        )
      ).status,
    ).toBe(403);
    expect(state.from).not.toHaveBeenCalled();
  });
  it("deduplicates by event ID, stores no customer body and does not grant on webhook payload", async () => {
    state.from.mockImplementation((t) => chain(t, [{ id: "evt_test" }]));
    expect(
      (
        await asaasListingWebhook(
          webhook({
            id: "evt_test",
            event: "PAYMENT_RECEIVED",
            payment: {
              id: "pay_test",
              value: 150,
              customer: { cpfCnpj: "not stored" },
            },
          }),
        )
      ).status,
    ).toBe(200);
    expect(writes[0].value).toEqual({
      id: "evt_test",
      kind: "PAYMENT_RECEIVED",
      resource_id: "pay_test",
      resource_type: "payment",
    });
    expect(state.rpc).toHaveBeenCalledWith("member_billing_dispatch");
    expect(
      state.rpc.mock.calls.some(
        (c) => c[0] === "member_billing_record_payment",
      ),
    ).toBe(false);
    state.from.mockImplementation((t) => chain(t, []));
    state.rpc.mockClear();
    await asaasListingWebhook(
      webhook({
        id: "evt_test",
        event: "PAYMENT_RECEIVED",
        payment: { id: "pay_test" },
      }),
    );
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it("requires a validated user token and ownership, not an ID in the URL", async () => {
    const req = () =>
      new Request("https://vitale.invalid/api/member/listing-billing", {
        method: "POST",
        headers: { Authorization: "Bearer fake.jwt" },
        body: JSON.stringify({ action: "status", listingId: order.listing_id }),
      });
    state.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect((await memberListingBilling(req())).status).toBe(401);
    state.getUser.mockResolvedValue({
      data: { user: { id: owner } },
      error: null,
    });
    state.from.mockImplementation((t) => chain(t, null));
    expect((await memberListingBilling(req())).status).toBe(404);
  });
});
describe("checkout creates only a fixed consented monthly contract", () => {
  it("double clicks reuse the reserved order without calling the financial provider", async () => {
    process.env.ASAAS_API_KEY = "test-key";
    state.getUser.mockResolvedValue({
      data: { user: { id: owner, email: "payer@example.invalid" } },
      error: null,
    });
    state.from.mockImplementation((t) =>
      chain(
        t,
        t === "member_bike_listings"
          ? { id: order.listing_id, title: "Bike sintética", user_id: owner }
          : order,
      ),
    );
    state.rpc.mockResolvedValue({
      data: { ...order, reserved: false },
      error: null,
    });
    const response = await memberListingBilling(
      new Request("https://vitale.invalid/api/member/listing-billing", {
        method: "POST",
        headers: { Authorization: "Bearer fake.jwt" },
        body: JSON.stringify({
          action: "checkout",
          listingId: order.listing_id,
          method: "card",
          document: "52998224725",
          contactConsent: true,
          monthlyAccepted: true,
          value: 1,
          userId: "spoofed",
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith("member_billing_checkout", {
      p_actor: owner,
      p_id: order.listing_id,
      p_method: "card",
      p_contact: true,
      p_monthly: true,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("card creation persists provider ID and never lets a redirect grant access", async () => {
    process.env.ASAAS_API_KEY = "test-key";
    state.getUser.mockResolvedValue({
      data: { user: { id: owner, email: "payer@example.invalid" } },
      error: null,
    });
    state.from.mockImplementation((t) =>
      chain(
        t,
        t === "member_bike_listings"
          ? { id: order.listing_id, title: "Bike sintética", user_id: owner }
          : t === "member_billing_customers"
            ? { asaas_customer_id: "cus_test" }
            : t === "member_listing_billing"
              ? [{ ...order, status: "creating" }]
              : order,
      ),
    );
    state.rpc.mockImplementation(async (name: string) => ({
      data:
        name === "member_billing_checkout"
          ? { ...order, status: "creating", reserved: true }
          : null,
      error: null,
    }));
    const send = vi.mocked(globalThis.fetch);
    send.mockImplementation(async (input, init) => {
      const url = String(input);
      if (url.endsWith("/customers/cus_test"))
        return Response.json({
          externalReference: owner,
          cpfCnpj: "52998224725",
        });
      if (url.endsWith("/subscriptions")) {
        expect(JSON.parse(String(init?.body))).toMatchObject({
          value: 150,
          cycle: "MONTHLY",
          externalReference: id,
          billingType: "CREDIT_CARD",
          customer: "cus_test",
        });
        return Response.json({ id: "sub_new" });
      }
      if (url.includes("/subscriptions/sub_new/payments"))
        return Response.json({
          data: [{ invoiceUrl: "https://asaas.com/i/synthetic" }],
        });
      throw Error("unexpected fetch");
    });
    const response = await memberListingBilling(
      new Request("https://vitale.invalid/api/member/listing-billing", {
        method: "POST",
        headers: { Authorization: "Bearer fake.jwt" },
        body: JSON.stringify({
          action: "checkout",
          listingId: order.listing_id,
          method: "card",
          document: "52998224725",
          contactConsent: true,
          monthlyAccepted: true,
          value: 1,
        }),
      }),
    );
    expect(response.status).toBe(200);
    expect(writes.some((w) => w.value.subscription_id === "sub_new")).toBe(
      true,
    );
    expect(writes.some((w) => w.value.status === "active")).toBe(false);
    expect(
      send.mock.calls.filter((c) => String(c[0]).endsWith("/subscriptions")),
    ).toHaveLength(1);
  });
});
describe("authoritative financial reconciliation", () => {
  const paid = {
    id: "pay_test",
    subscription: "sub_test",
    customer: "cus_test",
    value: 150,
    dueDate: "2026-11-04",
    billingType: "CREDIT_CARD",
    status: "CONFIRMED",
  };
  it("uses GET payment, validates customer/amount/subscription, then records normalized proof", async () => {
    await reconcilePayment(
      db(),
      api({ "/payments/pay_test": paid }),
      "pay_test",
    );
    expect(state.rpc).toHaveBeenCalledWith(
      "member_billing_record_payment",
      expect.objectContaining({
        p_order: id,
        p_payment: "pay_test",
        p_paid: true,
        p_status: "CONFIRMED",
      }),
    );
    for (const mismatch of [
      { customer: "cus_other" },
      { value: 1 },
      { subscription: "sub_other" },
    ]) {
      state.rpc.mockClear();
      await expect(
        reconcilePayment(
          db(),
          api({ "/payments/pay_test": { ...paid, ...mismatch } }),
          "pay_test",
          order,
        ),
      ).rejects.toThrow("billing_mismatch");
      expect(state.rpc).not.toHaveBeenCalled();
    }
  });
  it("chargeback cannot retain access even with a CONFIRMED top-level status", async () => {
    await reconcilePayment(
      db(),
      api({
        "/payments/pay_test": { ...paid, chargeback: { status: "DISPUTE" } },
      }),
      "pay_test",
    );
    expect(state.rpc).toHaveBeenCalledWith(
      "member_billing_record_payment",
      expect.objectContaining({
        p_paid: false,
        p_status: "CHARGEBACK_REQUESTED",
      }),
    );
  });
  it("correlates the first Pix through its transaction, not only subscription", async () => {
    const pix = {
      ...order,
      method: "pix_automatic",
      subscription_id: null,
      conciliation_id: "conc_test",
    };
    state.from.mockImplementation((t) => chain(t, pix));
    await reconcilePayment(
      db(),
      api({
        "/payments/pay_test": {
          ...paid,
          subscription: null,
          billingType: "PIX",
          pixTransaction: "txn_test",
          status: "RECEIVED",
        },
        "/pix/transactions/txn_test": { conciliationIdentifier: "conc_test" },
      }),
      "pay_test",
    );
    expect(state.rpc).toHaveBeenCalledWith(
      "member_billing_record_payment",
      expect.objectContaining({ p_paid: true }),
    );
  });
  it("authorization ACTIVE alone never records a paid cycle", async () => {
    state.from.mockImplementation((t) =>
      chain(t, {
        ...order,
        method: "pix_automatic",
        authorization_id: "auth_test",
      }),
    );
    await reconcileEvent(
      db(),
      api({
        "/pix/automatic/authorizations/auth_test": {
          id: "auth_test",
          customerId: "cus_test",
          contractId: id.replaceAll("-", ""),
          value: 150,
          frequency: "MONTHLY",
          paymentCreationMode: "SUBSCRIPTION",
          status: "ACTIVE",
        },
      }),
      {
        id: "evt_test",
        resource_id: "auth_test",
        resource_type: "authorization",
        lease_token: "lease",
        attempts: 1,
      },
    );
    expect(state.rpc).not.toHaveBeenCalled();
    expect(writes[0].value).toEqual({ renewal_status: "ACTIVE" });
  });
  it("cancels only the known recurrence and declares closed after provider success", async () => {
    await cancelOrder(
      db(),
      api({ "/subscriptions/sub_test": { deleted: true } }),
      { ...order, status: "cancel_pending" },
    );
    expect(writes.at(-1).value.status).toBe("cancelled");
  });
  it("lost creation is looked up before cancellation; missing uncertain resource remains pending", async () => {
    await expect(
      cancelOrder(
        db(),
        api({
          [`/subscriptions?externalReference=${id}&limit=2`]: { data: [] },
        }),
        { ...order, subscription_id: null, error_code: "creation_uncertain" },
      ),
    ).rejects.toThrow("billing_uncertain");
    expect(writes.some((w) => w.value.status === "cancelled")).toBe(false);
  });
});
