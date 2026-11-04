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
  listingBillingWorker,
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
  let single = false;
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
      if (["single", "maybeSingle"].includes(name)) single = true;
      if (["update", "upsert"].includes(name))
        writes.push({ table, action: name, value: args[0] });
      return x;
    });
  x.then = (resolve: any) =>
    Promise.resolve({
      data: single && Array.isArray(value) ? value[0] : value,
      error: null,
    }).then(resolve);
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
describe("anonymous hosted checkout", () => {
  const checkoutId = "30000000-0000-4000-8000-000000000001";
  const hosted = {
    ...order,
    method: "hosted",
    checkout_id: checkoutId,
    customer_id: null,
    subscription_id: null,
    status: "pending",
  };
  const request = (extra: Record<string, unknown> = {}) =>
    new Request("https://vitale.invalid/api/member/listing-billing", {
      method: "POST",
      headers: { Authorization: "Bearer fake.jwt" },
      body: JSON.stringify({
        action: "checkout",
        listingId: order.listing_id,
        contactConsent: true,
        monthlyAccepted: true,
        ...extra,
      }),
    });
  beforeEach(() => {
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
          : [hosted],
      ),
    );
  });
  it("reuses the same order on a double click without creating a new checkout", async () => {
    state.rpc.mockResolvedValue({
      data: { ...hosted, reserved: false },
      error: null,
    });
    expect((await memberListingBilling(request())).status).toBe(200);
    expect(state.rpc).toHaveBeenCalledWith("member_billing_checkout", {
      p_actor: owner,
      p_id: order.listing_id,
      p_method: "hosted",
      p_contact: true,
      p_monthly: true,
    });
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("rejects payer documents and client price/ownership overrides instead of accepting them", async () => {
    for (const extra of [
      { document: "synthetic-unwanted-document" },
      { customerData: { cpfCnpj: "not-accepted" } },
      { value: 1 },
      { userId: "spoofed" },
    ])
      expect((await memberListingBilling(request(extra))).status).toBe(400);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
  it("creates one fixed monthly checkout with no payer/customer fields or customer API calls", async () => {
    state.rpc.mockImplementation(async (name: string) => ({
      data:
        name === "member_billing_checkout"
          ? { ...hosted, status: "creating", reserved: true }
          : null,
      error: null,
    }));
    vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
      expect(String(input)).toBe("https://api.asaas.com/v3/checkouts");
      const body = JSON.parse(String(init?.body));
      expect(body).toMatchObject({
        billingTypes: ["CREDIT_CARD", "PIX"],
        chargeTypes: ["RECURRENT"],
        externalReference: id,
        items: [{ quantity: 1, value: 150 }],
        subscription: { cycle: "MONTHLY" },
      });
      expect(body).not.toHaveProperty("customer");
      expect(body).not.toHaveProperty("customerData");
      expect(body).not.toHaveProperty("document");
      return Response.json({ id: checkoutId });
    });
    const response = await memberListingBilling(request());
    expect(response.status).toBe(200);
    expect(writes.some((w) => w.value.checkout_id === checkoutId)).toBe(true);
    expect(writes.some((w) => w.value.status === "active")).toBe(false);
    expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(1);
  });
  it("grants only when a GET payment matches the known checkout and authoritative monthly subscription", async () => {
    state.from.mockImplementation((t) => chain(t, hosted));
    await reconcilePayment(
      db(),
      api({
        "/payments/pay_hosted": {
          id: "pay_hosted",
          checkoutSession: checkoutId,
          customer: "cus_hosted",
          subscription: "sub_hosted",
          billingType: "CREDIT_CARD",
          status: "CONFIRMED",
          value: 150,
          dueDate: "2026-11-04",
        },
        "/subscriptions/sub_hosted": {
          customer: "cus_hosted",
          value: 150,
          cycle: "MONTHLY",
        },
      }),
      "pay_hosted",
    );
    expect(state.rpc).toHaveBeenCalledWith(
      "member_billing_record_payment",
      expect.objectContaining({ p_order: id, p_paid: true }),
    );
    expect(writes[0].value).toMatchObject({
      customer_id: "cus_hosted",
      subscription_id: "sub_hosted",
    });
  });
  it("checkout paid event alone never grants access or stores payer data", async () => {
    state.from.mockImplementation((t) => chain(t, hosted));
    await reconcileEvent(db(), api({}), {
      id: "evt_checkout",
      resource_id: checkoutId,
      resource_type: "checkout",
      kind: "CHECKOUT_PAID",
      lease_token: "lease",
      attempts: 1,
    });
    expect(state.rpc).not.toHaveBeenCalled();
    expect(writes).toHaveLength(0);
  });
  it("accepts real Asaas event IDs containing ampersands and discards customerData", async () => {
    state.from.mockImplementation((t) => chain(t, []));
    const response = await asaasListingWebhook(
      webhook({
        id: "evt_checkout&123",
        event: "CHECKOUT_CREATED",
        checkout: {
          id: checkoutId,
          externalReference: id,
          customerData: { cpfCnpj: "not-stored" },
        },
      }),
    );
    expect(response.status).toBe(200);
    expect(writes[0].value).toEqual({
      id: "evt_checkout&123",
      kind: "CHECKOUT_CREATED",
      resource_id: checkoutId,
      resource_type: "checkout",
      order_reference: id,
    });
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

it("signed health reports only non-sensitive provider diagnostics and never creates a financial resource", async () => {
  process.env.ASAAS_API_KEY = "$aact_prod_test-only-no-real-key";
  state.rpc.mockResolvedValue({ data: true, error: null });
  state.from.mockImplementation((t) => chain(t, { last_health_at: null }));
  vi.mocked(globalThis.fetch).mockResolvedValue(
    new Response("private provider body", { status: 401 }),
  );
  const response = await listingBillingWorker(
    new Request(
      "https://vitale.invalid/api/public/classifieds-billing-worker",
      { method: "POST" },
    ),
  );
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({
    ok: false,
    providerConnected: false,
    providerHttpStatus: 401,
    credentialFormatValid: true,
  });
  expect(writes.at(-1).value.provider_ready).toBe(false);
  expect(
    vi
      .mocked(globalThis.fetch)
      .mock.calls.every((c) => !c[1]?.method || c[1].method === "GET"),
  ).toBe(true);
});

it("validates an anonymous hosted session without completing payment and cancels the quote", async () => {
  process.env.ASAAS_API_KEY = "test-only";
  state.rpc.mockResolvedValue({ data: true, error: null });
  state.from.mockImplementation((t) => chain(t, { enabled: false }));
  const checkoutId = "30000000-0000-4000-8000-000000000099";
  const calls: Array<{ url: string; method: string }> = [];
  vi.mocked(globalThis.fetch).mockImplementation(async (input, init) => {
    const url = String(input),
      method = init?.method ?? "GET";
    calls.push({ url, method });
    if (url.endsWith("/checkouts")) {
      const b = JSON.parse(String(init?.body));
      expect(b).not.toHaveProperty("customerData");
      expect(b).not.toHaveProperty("customer");
      return Response.json({ id: checkoutId });
    }
    if (url.endsWith(`/checkouts/${checkoutId}/cancel`))
      return Response.json({ status: "CANCELED" });
    if (url.includes("/webhooks?"))
      return Response.json({
        data: [
          {
            id: "hook_test",
            name: "Vitale",
            url: "https://vitalemobilidade.com/api/public/asaas-webhook",
            email: "operator@example.invalid",
            enabled: true,
            events: ["PAYMENT_RECEIVED"],
            sendType: "NON_SEQUENTIALLY",
          },
        ],
      });
    if (url.endsWith("/webhooks/hook_test")) {
      const b = JSON.parse(String(init?.body));
      expect(b.events).toContain("PAYMENT_RECEIVED");
      expect(b.events).toContain("CHECKOUT_PAID");
      expect(b.authToken).toBe(process.env.ASAAS_WEBHOOK_TOKEN);
      return Response.json({ id: "hook_test" });
    }
    throw Error("Unexpected provider operation");
  });
  const response = await listingBillingWorker(
    new Request(
      "https://vitale.invalid/api/public/classifieds-billing-worker",
      {
        method: "POST",
        body: JSON.stringify({ action: "validate_hosted_checkout" }),
      },
    ),
  );
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    hostedReady: true,
    checkoutCancelled: true,
  });
  expect(
    calls.some((c) => /\/customers|\/subscriptions|\/payments/.test(c.url)),
  ).toBe(false);
  expect(writes.some((w) => w.value.hosted_ready === true)).toBe(true);
});

it("cancels a hosted card subscription without accessing the unrelated Pix authorization API", async () => {
  const hosted = {
    ...order,
    method: "hosted",
    checkout_id: "30000000-0000-4000-8000-000000000001",
    checkout_expires_at: new Date(Date.now() + 3600000).toISOString(),
    provider_billing_type: "CREDIT_CARD",
    status: "cancel_pending",
  };
  await cancelOrder(
    db(),
    api({
      "/checkouts/30000000-0000-4000-8000-000000000001/cancel": {
        status: "CANCELED",
      },
      "/subscriptions/sub_test": { deleted: true },
    }),
    hosted,
  );
  expect(writes.at(-1).value.status).toBe("cancelled");
});

it("a partial refund in authoritative metadata cannot retain a confirmed payment entitlement", async () => {
  await reconcilePayment(
    db(),
    api({
      "/payments/pay_partial": {
        id: "pay_partial",
        subscription: "sub_test",
        customer: "cus_test",
        value: 150,
        dueDate: "2026-11-04",
        billingType: "CREDIT_CARD",
        status: "CONFIRMED",
        refunds: [{ status: "DONE", value: 50 }],
      },
    }),
    "pay_partial",
  );
  expect(state.rpc).toHaveBeenCalledWith(
    "member_billing_record_payment",
    expect.objectContaining({ p_paid: false, p_status: "REFUND_IN_PROGRESS" }),
  );
});
