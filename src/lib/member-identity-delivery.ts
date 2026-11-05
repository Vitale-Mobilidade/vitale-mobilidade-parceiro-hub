import { supabase } from "@/integrations/supabase/client";
import { memberPhone } from "./member-identity";
export type IdentityChannel = "email" | "phone";
export type IdentityDelivery = Record<IdentityChannel, { ok: boolean }>;
export async function requestMemberIdentityCode(
  channel: IdentityChannel,
  phone?: string,
  consent = false,
) {
  const canonical = channel === "phone" ? memberPhone(phone ?? "") : undefined;
  if (channel === "phone" && (!canonical || !consent))
    throw new Error("invalid_phone");
  const { data, error } = await supabase.functions.invoke(
    "member-identity-code",
    {
      body: { channel, ...(canonical ? { phone: canonical, consent } : {}) },
    },
  );
  if (error || data?.ok !== true)
    throw new Error(data?.error ?? "identity_delivery_unavailable");
}
/** Called only by the successful signup submit, never by a render/effect/reload. */
export async function requestSignupIdentityCodes(
  phone: string,
  emailVerified = false,
): Promise<IdentityDelivery> {
  const result = await Promise.allSettled([
    emailVerified ? Promise.resolve() : requestMemberIdentityCode("email"),
    requestMemberIdentityCode("phone", phone, true),
  ]);
  return {
    email: { ok: result[0].status === "fulfilled" },
    phone: { ok: result[1].status === "fulfilled" },
  };
}
