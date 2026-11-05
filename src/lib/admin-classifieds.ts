import { z } from "zod";
import { listingDraftInputSchema } from "./bike-classifieds";
const uuid = z.string().uuid();
const id = z.object({ id: uuid }).strict();
export const adminClassifiedsInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("metrics"),
      days: z.number().int().min(1).max(90).default(30),
    })
    .strict(),
  z.object({ action: z.enum(["list", "create"]) }).strict(),
  z
    .object({
      action: z.enum(["get", "withdraw", "archive", "sold", "reserve_image"]),
      payload: id,
    })
    .strict(),
  z
    .object({
      action: z.enum(["finalize_image", "remove_image", "cover"]),
      payload: id.extend({ assetId: uuid }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("save"),
      payload: listingDraftInputSchema.extend({ id: uuid }).strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("publish"),
      payload: id
        .extend({
          whatsapp: z.string().regex(/^55[1-9][0-9]9[0-9]{8}$/),
          contactConsent: z.literal(true),
        })
        .strict(),
    })
    .strict(),
]);
export const memberMetricsSchema = z.object({
  generatedAt: z.string(),
  days: z.number(),
  members: z.number(),
  listings: z.number(),
  channelListings: z.number(),
  activeListings: z.number(),
  grossCents: z.number(),
  reversedPayments: z.number(),
  daily: z.array(
    z.object({
      day: z.string(),
      members: z.number(),
      listings: z.number(),
      payments: z.number(),
      grossCents: z.number(),
    }),
  ),
});
export type MemberMetrics = z.infer<typeof memberMetricsSchema>;
