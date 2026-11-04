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
  archived: "Desativado",
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
  title: text(6, 100).refine((value) => value !== "Minha bike"),
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
export const listingDraftInputSchema = listingInputSchema.extend({
  title: text(0, 100).refine((value) => value.length !== 1),
  brand: text(0, 60),
  model: text(0, 80),
  city: text(0, 80),
  state: z.string().refine((v) => v === "" || STATES.includes(v)),
  priceCents: z.number().int().min(0).max(100000000),
  mileageKm: z.number().int().min(0).max(1000000).nullable(),
  description: text(0, 4000),
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
  feeStatus: z.enum(["pilot_exempt", "required", "paid"]),
  displayExpiresAt: z.string().nullable().optional(),
  images: z.array(listingImageSchema).max(5),
  sellerType: z.enum(["channel", "individual"]).default("individual"),
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
  sellerType: z.enum(["channel", "individual"]).default("individual"),
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
    billing_pending:
      "Há um pagamento em andamento. Encerre a solicitação antes de editar a bike.",
    billing_required:
      "Confirme o pagamento único de R$150 para publicar por 90 dias.",
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

/** Empty server drafts are reused, never promoted to dashboard listings. */
export function isEmptyBikeDraft(listing: BikeListing): boolean {
  return (
    listing.status === "draft" &&
    ["", "Minha bike"].includes(listing.title.trim()) &&
    !listing.brand.trim() &&
    !listing.model.trim() &&
    !listing.description.trim() &&
    !listing.city.trim() &&
    !listing.state &&
    !listing.priceCents &&
    listing.mileageKm === null &&
    listing.modelYear === null &&
    listing.condition === "good" &&
    listing.battery === "unknown" &&
    !listing.invoice &&
    !listing.maintenance.trim() &&
    listing.images.length === 0
  );
}
export function listingWhatsAppMessage(
  listing: Pick<BikeListing, "id" | "title">,
): string {
  const id = z.string().uuid().parse(listing.id);
  return `Olá! Vi a bike ${listing.title.trim() || "do seu anúncio"} na Vitale Mobilidade e gostaria de saber se ainda está disponível. https://vitalemobilidade.com/venda-sua-bike/${id}`;
}
export function listingWhatsAppHref(
  phone: string,
  listing: Pick<BikeListing, "id" | "title">,
): string {
  const digits = phone.replace(/^\+/, "");
  if (!/^55[1-9][0-9]9[0-9]{8}$/.test(digits)) throw new Error("invalid_phone");
  return `https://wa.me/${digits}?text=${encodeURIComponent(listingWhatsAppMessage(listing))}`;
}
