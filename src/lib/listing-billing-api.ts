import { supabase } from "@/integrations/supabase/client";
import { billingMessage, billingResponseSchema } from "./listing-billing";
export async function listingBillingCall(
  action: "status" | "checkout" | "cancel",
  listingId: string,
  payload: Record<string, unknown> = {},
) {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error("Entre na sua conta para continuar.");
  const response = await fetch("/api/member/listing-billing", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({ action, listingId, ...payload }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(billingMessage(body.error));
  return billingResponseSchema.parse(body);
}
