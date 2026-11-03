import { expect, it } from "vitest";
import {
  referralCode,
  referralDashboardSchema,
  referralLink,
  referralWhatsAppLink,
} from "./newsletter-referrals";
it.each([
  "https://evil.invalid",
  "//evil.invalid",
  "A".repeat(32),
  "x".repeat(32),
  "a".repeat(33),
  null,
])("rejects an invalid invitation code %s", (value) =>
  expect(referralCode(value)).toBeUndefined(),
);
it("creates fixed-origin encoded sharing links with no contact or recipient data", () => {
  const code = "a".repeat(32);
  expect(referralLink(code)).toBe(
    `https://vitalemobilidade.com/conta?modo=cadastro&convite=${code}`,
  );
  const whatsapp = new URL(referralWhatsAppLink(code));
  expect(whatsapp.hostname).toBe("wa.me");
  expect(whatsapp.searchParams.get("text")).toContain(referralLink(code));
  expect(() => referralLink("//evil.invalid")).toThrow();
});
it("dashboard rejects fake results and strips unexpected fields", () => {
  expect(
    referralDashboardSchema.safeParse({
      enabled: true,
      code: "a".repeat(32),
      visits: -1,
      pending: 0,
      confirmed: 0,
      history: [],
    }).success,
  ).toBe(false);
  expect(
    referralDashboardSchema.parse({
      enabled: true,
      code: "a".repeat(32),
      visits: 3,
      pending: 1,
      confirmed: 2,
      history: [],
      email: "secret@example.invalid",
    }),
  ).not.toHaveProperty("email");
});
