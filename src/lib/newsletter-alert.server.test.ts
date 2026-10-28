import { afterEach, expect, it, vi } from "vitest";
import { newsletterTestDb } from "@/test/helpers/newsletter-db";
import { notifyNewsletterError } from "./newsletter-alert.server";
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
it("sends one operational alert per edition/error across repeated ticks", async () => {
  vi.stubEnv("RESEND_API_KEY", "synthetic");
  vi.stubEnv("LOVABLE_API_KEY", "");
  const request = vi
    .fn()
    .mockResolvedValue(new Response('{"id":"accepted"}', { status: 200 }));
  vi.stubGlobal("fetch", request);
  const f = newsletterTestDb({
    newsletter_settings: [
      { singleton: true, from_email: "newsletter@example.com" },
    ],
  });
  await notifyNewsletterError(
    f.db,
    "2026-10-28",
    "newsletter_offer_unavailable",
  );
  await notifyNewsletterError(
    f.db,
    "2026-10-28",
    "newsletter_offer_unavailable",
  );
  expect(request).toHaveBeenCalledTimes(1);
  const options = request.mock.calls[0][1];
  expect(JSON.parse(options.body).text).toContain(
    "newsletter_offer_unavailable",
  );
  expect(JSON.parse(options.body).text).toContain("/admin/newsletter");
  expect(options.headers["Idempotency-Key"]).toMatch(/^newsletter-error-/);
  expect(f.tables.editorial_audit_logs[0].action).toBe("newsletter_alert_sent");
});
it("retries failed alerts after ten minutes, using the same provider idempotency key", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-28T10:00:00Z"));
  vi.stubEnv("RESEND_API_KEY", "synthetic");
  vi.stubEnv("LOVABLE_API_KEY", "");
  const request = vi
    .fn()
    .mockResolvedValueOnce(new Response("", { status: 503 }))
    .mockResolvedValue(new Response('{"id":"accepted"}'));
  vi.stubGlobal("fetch", request);
  const f = newsletterTestDb({
    newsletter_settings: [
      { singleton: true, from_email: "newsletter@example.com" },
    ],
  });
  await notifyNewsletterError(
    f.db,
    "2026-10-28",
    "newsletter_writer_review_failed",
  );
  await notifyNewsletterError(
    f.db,
    "2026-10-28",
    "newsletter_writer_review_failed",
  );
  expect(request).toHaveBeenCalledTimes(1);
  vi.setSystemTime(new Date("2026-10-28T10:11:00Z"));
  await notifyNewsletterError(
    f.db,
    "2026-10-28",
    "newsletter_writer_review_failed",
  );
  expect(request).toHaveBeenCalledTimes(2);
  expect(request.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
    request.mock.calls[1][1].headers["Idempotency-Key"],
  );
});
it("never alerts lock contention and never masks a database or provider failure", async () => {
  const f = newsletterTestDb();
  await notifyNewsletterError(f.db, "2026-10-28", "newsletter_busy");
  expect(f.writes).toHaveLength(0);
  f.failNext("editorial_audit_logs", "select");
  await expect(
    notifyNewsletterError(f.db, "2026-10-28", "newsletter_database_failed"),
  ).resolves.toBeUndefined();
});
