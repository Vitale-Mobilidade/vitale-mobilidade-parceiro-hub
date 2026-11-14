import { isClassifiedsFee } from "./classifieds-price";
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
    "expired",
  ]),
  amountCents: z.number().refine(isClassifiedsFee).optional(),
  paymentUrl: z.string().nullable(),
  checkoutExpiresAt: z.string().nullable().optional(),
  displayStartedAt: z.string().nullable(),
  paidUntil: z.string().nullable(),
  hold: z.boolean(),
});
export type BillingOrderView = z.infer<typeof billingOrderSchema>;
export const billingResponseSchema = z.object({
  configured: z.boolean().optional(),
  serverNow: z.string().optional(),
  amountCents: z.number().optional(),
  displayDays: z.number().optional(),
  billingModel: z.literal("one_time_90d").optional(),
  order: billingOrderSchema.nullable(),
});
export const billingMessage = (code: string) =>
  ({
    listing_phone_confirmation:
      "Confirme seu WhatsApp na etapa Informações antes de continuar.",
    courtesy_available:
      "Você tem uma cortesia disponível. Use-a para publicar sem pagamento.",
    billing_credit_available:
      "Você tem um período pago disponível. Use-o para publicar sem nova cobrança.",
    identity_verification_required:
      "Confirme seu e-mail e WhatsApp no perfil para continuar.",
    billing_price_changed:
      "O valor para anunciar mudou. Atualize a página para continuar com o preço vigente.",
    billing_consent_required:
      "Aceite o pagamento único e o contato dos compradores para continuar.",
    billing_uncertain:
      "O Asaas ainda está confirmando a solicitação. Aguarde antes de tentar novamente; evitamos gerar cobranças duplicadas.",
    billing_provider_rejected:
      "O Asaas não aceitou a solicitação. Confira os dados e tente novamente.",
    listing_incomplete:
      "Complete a ficha e envie ao menos uma foto antes de pagar.",
    billing_pending:
      "Há um pagamento em andamento. Encerre a solicitação antes de editar esta bike.",
  })[code] ??
  "O pagamento está temporariamente indisponível. Seu rascunho continua salvo.";
