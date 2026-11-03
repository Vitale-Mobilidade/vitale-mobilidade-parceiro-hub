import { z } from "zod";
import { memberAccountsEnabled } from "./member-accounts-feature";

export const newsletterReferralsEnabled =
  memberAccountsEnabled &&
  import.meta.env.VITE_NEWSLETTER_REFERRALS_ENABLED !== "false";
export function referralCode(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-f0-9]{32}$/.test(value)
    ? value
    : undefined;
}
export function referralLink(code: string) {
  const valid = referralCode(code);
  if (!valid) throw new Error("invalid_referral_code");
  return `https://vitalemobilidade.com/conta?modo=cadastro&convite=${valid}`;
}
export function referralWhatsAppLink(code: string) {
  return `https://wa.me/?text=${encodeURIComponent(`Entre para a comunidade Vitale Mobilidade e receba nossa newsletter: ${referralLink(code)}`)}`;
}
export const referralDashboardSchema = z.discriminatedUnion("enabled", [
  z.object({ enabled: z.literal(false) }),
  z.object({
    enabled: z.literal(true),
    code: z.string().regex(/^[a-f0-9]{32}$/),
    visits: z.number().int().nonnegative(),
    pending: z.number().int().nonnegative(),
    confirmed: z.number().int().nonnegative(),
    history: z.array(
      z.object({
        day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        confirmed: z.number().int().positive(),
      }),
    ),
  }),
]);
export type ReferralDashboard = z.infer<typeof referralDashboardSchema>;
