import { z } from "zod";
export const billingOrderSchema = z.object({
  id: z.string().uuid(),
  method: z.enum(["card", "pix_automatic", "hosted"]),
  status: z.enum([
    "creating",
    "pending",
    "active",
    "uncertain",
    "cancel_pending",
    "cancelled",
    "failed",
  ]),
  paymentUrl: z.string().nullable(),
  pixPayload: z.string().nullable(),
  pixImage: z.string().nullable(),
  qrExpiresAt: z.string().nullable(),
  paidUntil: z.string().nullable(),
  renewalStatus: z.string().nullable(),
  hold: z.boolean(),
});
export type BillingOrderView = z.infer<typeof billingOrderSchema>;
export const billingResponseSchema = z.object({
  configured: z.boolean().optional(),
  monthlyCents: z.number().optional(),
  order: billingOrderSchema.nullable(),
});
export const billingMessage = (code: string) =>
  ({
    billing_document_invalid:
      "Confira o CPF ou CNPJ do responsável pelo pagamento.",
    identity_verification_required:
      "Confirme seu e-mail e WhatsApp no perfil para continuar.",
    billing_consent_required:
      "Autorize a mensalidade e o contato dos compradores para continuar.",
    billing_uncertain:
      "O Asaas ainda está confirmando a solicitação. Aguarde antes de tentar novamente; evitamos gerar assinaturas duplicadas.",
    billing_provider_rejected:
      "O Asaas não aceitou a solicitação. Confira os dados e tente novamente.",
    listing_incomplete:
      "Complete a ficha e envie ao menos uma foto antes de pagar.",
    billing_pending:
      "Há um pagamento em andamento. Encerre a solicitação antes de editar esta bike.",
  })[code] ??
  "O pagamento está temporariamente indisponível. Seu rascunho continua salvo.";
