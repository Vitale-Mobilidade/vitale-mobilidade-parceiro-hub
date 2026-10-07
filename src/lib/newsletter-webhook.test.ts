import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import { validResendWebhook } from "./newsletter-webhook.server";
const now = Date.parse("2026-10-07T20:00:00Z");
const timestamp = String(now / 1000);
const secret =
  "whsec_" + Buffer.from("synthetic-test-secret-key").toString("base64");
const raw = JSON.stringify({
  type: "contact.updated",
  data: { unsubscribed: true },
});
const signed = createHmac("sha256", Buffer.from(secret.slice(6), "base64"))
  .update(`event.${timestamp}.${raw}`)
  .digest("base64");
const headers = new Headers({
  "svix-id": "event",
  "svix-timestamp": timestamp,
  "svix-signature": `v1,${signed}`,
});
describe("newsletter webhook authenticity", () => {
  it("validates the exact raw body", () => {
    expect(validResendWebhook(raw, headers, secret, now)).toBe(true);
    expect(validResendWebhook(raw + " ", headers, secret, now)).toBe(false);
  });
  it("rejects expired, future and unsigned events", () => {
    expect(validResendWebhook(raw, headers, secret, now + 301_000)).toBe(false);
    expect(validResendWebhook(raw, headers, secret, now - 301_000)).toBe(false);
    expect(validResendWebhook(raw, new Headers(), secret, now)).toBe(false);
  });
  it("handles key rotation without accepting unknown signature versions", () => {
    const copy = new Headers(headers);
    copy.set("svix-signature", `v1,invalid v1,${signed}`);
    expect(validResendWebhook(raw, copy, secret, now)).toBe(true);
    copy.set("svix-signature", `v2,${signed}`);
    expect(validResendWebhook(raw, copy, secret, now)).toBe(false);
  });
});
