import { describe, expect, it, vi } from "vitest";
import { priceAlertEmailMessage } from "./price-alert-email";
import { deliverPriceAlertEmails } from "./price-alert-email.server";
import type { SupabaseClient } from "@supabase/supabase-js";
export const fixture = {
  id: "10000000-0000-4000-8000-000000000001",
  lease_token: "10000000-0000-4000-8000-000000000002",
  kind: "registered",
  delivery_from: "vitale@example.test",
  delivery_to: "pessoa@example.test",
  reply_to: "lucas@example.test",
  payload: {
    name: "Ana <script>alert(1)</script>",
    bikeId: "v9_max",
    bikeName: "V9 Max",
    currentPrice: 6250,
    referencePrice: 6500,
    targetPrice: 6000,
    image: "https://cdn.example.test/bike.jpg",
    link: "https://meli.la/FixtureOnly",
    observedAt: "2026-11-18T12:07:04.556Z",
  },
};
describe("price alert lifecycle email", () => {
  it("reports an authorized price update without pretending the selected target was reached", () => {
    const message = priceAlertEmailMessage({
      ...fixture,
      kind: "price_update",
      payload: { ...fixture.payload, currentPrice: 6174, targetPrice: 5900 },
    });
    expect(message.subject).toContain("preço atual da V9 Max");
    expect(message.text).toContain("6.174,00");
    expect(message.text).toContain("5.900,00");
    expect(message.text).toContain("não altera a condição que você escolheu");
    expect(message.text).not.toContain("dentro da condição");
    expect(message.text).not.toContain("foi registrado");
    expect(message.tags).toContainEqual({
      name: "kind",
      value: "price_update",
    });
  });
  it("uses actual bike, current/desired prices and direct links with escaped HTML", () => {
    const m = priceAlertEmailMessage(fixture);
    expect(m.html).toContain('src="https://cdn.example.test/bike.jpg"');
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain('href="https://meli.la/FixtureOnly"');
    expect(m.html).toContain(
      'href="https://vitalemobilidade.com/radar/v9_max"',
    );
    expect(m.html).toContain("https://vitalemobilidade.com/grupodeofertas");
    expect(m.text).toMatch(/6.250,00/);
    expect(m.text).toMatch(/6.000,00/);
    expect(m.to).toEqual([fixture.delivery_to]);
    expect(m).not.toHaveProperty("cc");
  });
  it("does not invent a target or a price fall in a registration", () => {
    const m = priceAlertEmailMessage({
      ...fixture,
      payload: { ...fixture.payload, targetPrice: null, image: null },
    });
    expect(m.text).toContain("Qualquer queda de preço");
    expect(m.html).not.toContain("<img");
    expect(m.subject).toContain("foi registrado");
    expect(m.text).not.toContain("Baixou!");
  });
  it.each([
    "javascript:alert(1)",
    "https://example.test/bad",
    "https://meli.la/ok?redirect=1",
    "https://meli.la@evil.test/x",
  ])("rejects an untrusted affiliate URL %s", (link) => {
    expect(() =>
      priceAlertEmailMessage({
        ...fixture,
        payload: { ...fixture.payload, link },
      }),
    ).toThrow();
  });
});
function setup(
  outcome: "ok" | "network" | "429" | "500" | "badjson" | "rejected",
  prepare: string | null = '{"immutable":true}',
) {
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "claim_price_alert_emails"
        ? [fixture]
        : name === "prepare_price_alert_email"
          ? prepare
          : true,
    error: null,
  }));
  const request = vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit) => {
      if (outcome === "network") throw new Error("private provider data");
      if (outcome === "badjson")
        return new Response("invalid", { status: 200 });
      if (outcome === "ok") return Response.json({ id: "provider-fixture" });
      return new Response(null, {
        status: outcome === "rejected" ? 422 : Number(outcome),
      });
    },
  );
  return { db: { rpc } as unknown as SupabaseClient, rpc, request };
}
describe("price alert email delivery", () => {
  it("never claims without a configured server key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const s = setup("ok");
    expect(await deliverPriceAlertEmails(s.db, s.request)).toEqual({
      configured: false,
      accepted: 0,
    });
    expect(s.rpc).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
  it("uses the persisted body and stable idempotency key and only marks provider acceptance", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only");
    const s = setup("ok");
    expect(await deliverPriceAlertEmails(s.db, s.request)).toMatchObject({
      accepted: 1,
    });
    expect(s.request.mock.calls[0]?.[1]).toMatchObject({
      body: '{"immutable":true}',
      headers: { "Idempotency-Key": `price-alert-${fixture.id}` },
    });
    expect(s.rpc).toHaveBeenLastCalledWith(
      "finish_price_alert_email",
      expect.objectContaining({
        p_status: "accepted",
        p_provider: "provider-fixture",
      }),
    );
    vi.unstubAllEnvs();
  });
  it.each(["network", "500", "badjson"] as const)(
    "does not automatically replay an uncertain result: %s",
    async (outcome) => {
      vi.stubEnv("RESEND_API_KEY", "test-only");
      const s = setup(outcome);
      await deliverPriceAlertEmails(s.db, s.request);
      expect(s.rpc).toHaveBeenLastCalledWith(
        "finish_price_alert_email",
        expect.objectContaining({ p_status: "uncertain", p_provider: null }),
      );
      vi.unstubAllEnvs();
    },
  );
  it("retries only explicit throttling and stops before POST if the reservation is not eligible", async () => {
    vi.stubEnv("RESEND_API_KEY", "test-only");
    const s = setup("429");
    await deliverPriceAlertEmails(s.db, s.request);
    expect(s.rpc).toHaveBeenLastCalledWith(
      "finish_price_alert_email",
      expect.objectContaining({ p_status: "pending" }),
    );
    const paused = setup("ok", null);
    await deliverPriceAlertEmails(paused.db, paused.request);
    expect(paused.request).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
