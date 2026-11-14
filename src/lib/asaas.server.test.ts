import { describe, it, expect, vi } from "vitest";
import {
  AsaasClient,
  AsaasFault,
  paidAsaasCycle,
  safeAsaasPaymentUrl,
} from "./asaas.server";

describe("Asaas transport and financial evidence", () => {
  it("uses fixed provider hosts and never follows redirects with the credential", async () => {
    const send = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "sub_test" }), { status: 200 }),
    );
    await new AsaasClient("private-test-key", "sandbox", send).call(
      "/subscriptions/sub_test",
    );
    expect(send).toHaveBeenCalledWith(
      "https://api-sandbox.asaas.com/v3/subscriptions/sub_test",
      expect.objectContaining({
        redirect: "manual",
        headers: expect.objectContaining({ access_token: "private-test-key" }),
      }),
    );
    await expect(
      new AsaasClient("x", "production", send).call("https://evil.invalid"),
    ).rejects.toBeInstanceOf(AsaasFault);
  });
  it("lost creation is uncertain and is never retried by the transport", async () => {
    const send = vi.fn(async () => {
      throw Error("lost response");
    });
    await expect(
      new AsaasClient("x", "production", send).call(
        "/subscriptions",
        "POST",
        {},
      ),
    ).rejects.toMatchObject({ uncertain: true });
    expect(send).toHaveBeenCalledTimes(1);
  });
  it("accepts already deleted resources idempotently and redacts provider errors", async () => {
    const send = vi.fn(
      async () => new Response("private customer information", { status: 404 }),
    );
    const api = new AsaasClient("x", "production", send);
    expect(await api.call("/subscriptions/sub_test", "DELETE")).toEqual({
      deleted: true,
    });
    await expect(api.call("/subscriptions/sub_test")).rejects.toMatchObject({
      message: "asaas_unavailable",
      status: 404,
    });
  });
  it("activation, authorization, provisional Pix and wrong values cannot grant publication", () => {
    for (const status of [
      "PENDING",
      "AUTHORIZED",
      "CONFIRMED",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
      "CHARGEBACK_REQUESTED",
    ])
      expect(
        paidAsaasCycle({ value: 150, billingType: "PIX", status }, 15000),
      ).toBe(false);
    expect(
      paidAsaasCycle(
        { value: 150, billingType: "PIX", status: "RECEIVED" },
        15000,
      ),
    ).toBe(true);
    expect(
      paidAsaasCycle(
        {
          value: 150,
          billingType: "CREDIT_CARD",
          status: "CONFIRMED",
        },
        15000,
      ),
    ).toBe(true);
    expect(
      paidAsaasCycle(
        {
          value: 1,
          billingType: "CREDIT_CARD",
          status: "CONFIRMED",
        },
        15000,
      ),
    ).toBe(false);
    expect(
      paidAsaasCycle(
        {
          value: 150,
          billingType: "PIX",
          status: "RECEIVED",
          deleted: true,
        },
        15000,
      ),
    ).toBe(false);
  });
  it("allows only HTTPS Asaas checkout destinations", () => {
    expect(
      safeAsaasPaymentUrl("https://asaas.com/i/invoice_test"),
    ).toBeTruthy();
    for (const url of [
      "https://asaas.com.evil.invalid/i/x",
      "https://x@asaas.com/i/x",
      "http://asaas.com/i/x",
      "javascript:alert(1)",
    ])
      expect(safeAsaasPaymentUrl(url)).toBeNull();
  });
});

it("preserves the global fetch receiver required by the production Workers runtime", async () => {
  const send = function (this: unknown) {
    if (this !== globalThis)
      throw new TypeError("Illegal invocation: incorrect this reference");
    return Promise.resolve(Response.json({ data: [] }));
  } as typeof fetch;
  await expect(
    new AsaasClient("test-only", "production", send).call(
      "/paymentLinks?limit=1",
    ),
  ).resolves.toEqual({ data: [] });
});
