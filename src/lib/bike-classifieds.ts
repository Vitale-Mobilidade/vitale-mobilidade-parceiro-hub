import { z } from "zod";
export const CLASSIFIEDS_FEE_CENTS = 15000;
export const MEMBER_MEDIA_BUCKET = "member-media";
export const STATES =
  "AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO".split(
    " ",
  );
export const CONDITIONS = {
  new: "Sem uso",
  excellent: "Excelente",
  good: "Bom",
  needs_repair: "Precisa de reparos",
} as const;
export const BATTERIES = {
  original: "Original",
  replaced: "Substituída",
  unknown: "Não sei informar",
  not_applicable: "Não se aplica",
} as const;
export const LISTING_STATUSES = {
  draft: "Rascunho",
  published: "Publicado",
  sold: "Vendida",
  archived: "Arquivado",
} as const;
const text = (min: number, max: number) =>
  z
    .string()
    .trim()
    .min(min)
    .max(max)
    .refine((v) =>
      Array.from(v).every(
        (char) =>
          [9, 10, 13].includes(char.charCodeAt(0)) ||
          (char.charCodeAt(0) >= 32 && char.charCodeAt(0) !== 127),
      ),
    );
export const listingInputSchema = z.object({
  title: text(6, 100),
  brand: text(1, 60),
  model: text(1, 80),
  priceCents: z.number().int().min(100).max(100000000),
  city: text(2, 80),
  state: z.string().refine((v) => STATES.includes(v)),
  modelYear: z
    .number()
    .int()
    .min(1980)
    .max(new Date().getFullYear() + 1)
    .nullable(),
  mileageKm: z.number().int().min(0).max(1000000),
  condition: z.enum(["new", "excellent", "good", "needs_repair"]),
  battery: z.enum(["original", "replaced", "unknown", "not_applicable"]),
  invoice: z.boolean(),
  description: text(20, 4000),
  maintenance: text(0, 1000),
});
export const listingImageSchema = z.object({
  id: z.string().uuid(),
  path: z
    .string()
    .regex(
      /^[a-f0-9-]{36}\/(?:avatar|listings\/[a-f0-9-]{36})\/[a-f0-9-]{36}\.webp$/,
    ),
  position: z.number().int().min(0).max(4),
  status: z.enum(["ready", "reserved"]),
  url: z.string().optional(),
});
export const listingSchema = listingInputSchema.extend({
  // Incomplete server-created drafts are valid to display, but never to publish.
  title: z.string(),
  brand: z.string(),
  model: z.string(),
  priceCents: z.number(),
  city: z.string(),
  state: z.string(),
  mileageKm: z.number().nullable(),
  modelYear: z.number().nullable(),
  description: z.string(),
  id: z.string().uuid(),
  status: z.enum(["draft", "published", "sold", "archived"]),
  feeCents: z.literal(15000),
  feeStatus: z.literal("pilot_exempt"),
  images: z.array(listingImageSchema).max(5),
  publishedAt: z.string().nullable(),
  updatedAt: z.string(),
});
export const publicListingSchema = listingSchema.extend({
  sellerName: z.string(),
  avatarPath: z.string().nullable(),
  avatarUrl: z.string().optional(),
  whatsapp: z.string().regex(/^55[1-9][0-9]9[0-9]{8}$/),
});
export const classifiedsAccountSchema = z.object({
  displayName: z.string().nullable(),
  communityJoined: z.boolean(),
  avatarPath: z.string().nullable(),
  avatarId: z.string().uuid().nullable().optional(),
  canAdvertise: z.boolean(),
  canPublish: z.boolean(),
  canUploadAvatar: z.boolean(),
});
export type BikeListing = z.infer<typeof listingSchema>;
export type PublicBikeListing = z.infer<typeof publicListingSchema>;
export type ClassifiedsAccount = z.infer<typeof classifiedsAccountSchema>;
export type ListingsResult =
  | { ok: true; items: PublicBikeListing[]; total: number }
  | { ok: false; items: []; total: 0 };
export function classifiedsError(error: unknown): string {
  const code =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : "";
  const messages: Record<string, string> = {
    classifieds_pilot_only:
      "Os anúncios estão em teste com uma conta convidada. A abertura para outros anunciantes virá depois.",
    listing_limit: "Você atingiu o limite de anúncios deste piloto.",
    listing_invalid: "Confira os campos do anúncio antes de salvar.",
    listing_incomplete:
      "Complete as informações e adicione de uma a cinco fotos antes de publicar.",
    listing_contact_consent:
      "Autorize a divulgação do seu WhatsApp verificado neste anúncio.",
    listing_image_limit:
      "Cada anúncio pode ter até cinco fotos. Remova uma para adicionar outra.",
    listing_not_draft: "Retire o anúncio do ar antes de editar.",
    listing_unavailable:
      "Este anúncio ou imagem não está disponível para sua conta.",
    media_rate_limited:
      "Você atingiu o limite diário de uploads. Tente novamente amanhã.",
    media_not_ready:
      "O envio da foto não foi concluído. Remova a imagem pendente e tente novamente.",
    image_invalid: "Escolha uma imagem JPEG, PNG ou WebP de até 10 MB.",
    image_too_large:
      "Não foi possível reduzir esta foto para 2 MB. Escolha outra imagem.",
  };
  return messages[code] ?? "";
}
