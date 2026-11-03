import { z } from "zod";
export const memberIdentitySchema = z.object({
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  phoneMasked: z.string().nullable(),
  canInteract: z.boolean(),
});
export type MemberIdentity = z.infer<typeof memberIdentitySchema>;
export function memberPhone(value: string): string | undefined {
  if (!/^[+()\d\s-]+$/.test(value)) return;
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11) digits = `55${digits}`;
  return /^55[1-9][0-9]9[0-9]{8}$/.test(digits) ? `+${digits}` : undefined;
}
