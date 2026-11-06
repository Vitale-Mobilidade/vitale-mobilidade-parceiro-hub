import { z } from "zod";
import { listingDraftInputSchema, listingSchema } from "./bike-classifieds";
const uuid = z.string().uuid();
const id = z.object({ id: uuid }).strict();
const search = z
  .object({
    query: z.string().trim().max(120).default(""),
    offset: z.number().int().min(0).max(100000).default(0),
  })
  .strict();
export const adminClassifiedsInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("members"),
      payload: search
        .extend({
          orderBy: z
            .enum(["name", "listings", "createdAt"])
            .default("createdAt"),
          direction: z.enum(["asc", "desc"]).default("desc"),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("listings"),
      payload: search
        .extend({
          status: z
            .enum(["all", "draft", "published", "sold", "archived"])
            .default("all"),
        })
        .strict(),
    })
    .strict(),
  z.object({ action: z.literal("member"), payload: id }).strict(),
  z
    .object({
      action: z.literal("remove_member"),
      payload: z
        .object({
          userId: uuid,
          email: z.string().trim().email().max(254),
          confirmed: z.literal(true),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("period_metrics"),
      payload: z
        .object({
          period: z.enum([
            "today",
            "yesterday",
            "week",
            "month",
            "last7",
            "last30",
            "last90",
            "custom",
          ]),
          start: z.string().date().optional(),
          end: z.string().date().optional(),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("grant"),
      payload: z
        .object({
          userId: uuid,
          requestId: uuid,
          quantity: z.number().int().min(1).max(10),
          reason: z.string().trim().min(5).max(300),
        })
        .strict(),
    })
    .strict(),
  z
    .object({
      action: z.literal("revoke"),
      payload: z
        .object({
          userId: uuid,
          courtesyId: uuid,
          reason: z.string().trim().min(5).max(300),
        })
        .strict(),
    })
    .strict(),
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
      action: z.literal("reorder"),
      payload: id.extend({ imageIds: z.array(uuid).min(1).max(5) }).strict(),
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
  trackingSince: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable()
    .optional(),
  excludedOrders: z.number().int().min(0).optional(),
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

export const adminMemberSchema = z.object({
  id: uuid,
  name: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  joinedAt: z.string(),
  suspended: z.boolean(),
  removalPending: z.boolean().optional(),
  emailVerified: z.boolean(),
  phoneVerified: z.boolean(),
  listings: z.number(),
  activeListings: z.number(),
  availableCourtesies: z.number(),
});
export type AdminMember = z.infer<typeof adminMemberSchema>;
export const adminListingSchema = listingSchema.extend({
  owner: adminMemberSchema.nullable(),
  createdAt: z.string(),
  entitled: z.boolean(),
});
export type AdminListing = z.infer<typeof adminListingSchema>;
export const courtesySchema = z.object({
  id: uuid,
  listingId: uuid.nullable(),
  reason: z.string(),
  grantedAt: z.string(),
  grantedBy: z.string().nullable(),
  startedAt: z.string().nullable(),
  expiresAt: z.string().nullable(),
  revokedAt: z.string().nullable(),
  revokeReason: z.string().nullable(),
});
export const adminMemberDetailSchema = z.object({
  member: adminMemberSchema,
  listings: z.array(adminListingSchema),
  courtesies: z.array(courtesySchema),
});
export type AdminMemberDetail = z.infer<typeof adminMemberDetailSchema>;
export const adminMembersResultSchema = z.object({
  total: z.number(),
  offset: z.number(),
  items: z.array(adminMemberSchema),
});
export const adminListingsResultSchema = z.object({
  total: z.number(),
  offset: z.number(),
  items: z.array(adminListingSchema),
});

const periodTotalsSchema = z.object({
  members: z.number(),
  listings: z.number(),
  channelListings: z.number(),
  publications: z.number(),
  payments: z.number(),
  grossCents: z.number(),
  reversedPayments: z.number(),
});
export const periodMetricsSchema = z.object({
  generatedAt: z.string(),
  period: z.string(),
  trackingSince: z.string().nullable(),
  excludedOrders: z.number(),
  start: z.string(),
  end: z.string(),
  previousStart: z.string(),
  previousEnd: z.string(),
  effectiveStart: z.string(),
  comparable: z.boolean(),
  current: periodTotalsSchema,
  previous: periodTotalsSchema.nullable(),
  activeNow: z.number(),
  daily: z.array(periodTotalsSchema.extend({ day: z.string() })),
});
export type PeriodMetrics = z.infer<typeof periodMetricsSchema>;
