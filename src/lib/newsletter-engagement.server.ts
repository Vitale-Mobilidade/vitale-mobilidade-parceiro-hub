import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ResendNewsletter } from "./resend-newsletter.server";

const inputSchema = z
  .object({
    action: z.literal("campaign_engagement"),
    campaign: z.string().uuid(),
    event: z.enum(["opened", "clicked"]),
    cursor: z.string().min(1).max(512).optional(),
  })
  .strict();
const pageSchema = z.object({
  has_more: z.boolean(),
  data: z
    .array(
      z.object({
        id: z.string().min(1).max(512),
        email: z.string().email().max(254),
        count: z.number().int().nonnegative(),
        clicked_links: z
          .array(
            z.object({
              url: z.string().max(4000),
              clicks: z.number().int().nonnegative(),
            }),
          )
          .optional(),
      }),
    )
    .max(25),
});

/** Called only after the existing admin authorization; never exposes provider credentials. */
export async function newsletterCampaignEngagement(
  db: SupabaseClient,
  provider: () => ResendNewsletter,
  body: Record<string, unknown>,
) {
  const input = inputSchema.parse(body);
  const { data: campaign, error } = await db
    .from("newsletter_campaigns")
    .select("resend_id")
    .eq("id", input.campaign)
    .maybeSingle();
  if (error) throw new Error("newsletter_database_failed");
  if (!campaign?.resend_id) throw new Error("newsletter_campaign_not_sent");
  const params = new URLSearchParams({ type: input.event, limit: "25" });
  if (input.cursor) params.set("after", input.cursor);
  const page = pageSchema.parse(
    await provider().call(
      `/broadcasts/${encodeURIComponent(campaign.resend_id)}/recipients?${params}`,
    ),
  );
  if (page.has_more && !page.data.length)
    throw new Error("invalid_resend_page");
  const emails = page.data.map((row) => row.email.toLowerCase());
  const names = emails.length
    ? await db
        .from("newsletter_subscriptions")
        .select("email,person_name")
        .in("email", emails)
    : { data: [], error: null };
  if (names.error) throw new Error("newsletter_database_failed");
  return {
    event: input.event,
    rows: page.data.map((row) => ({
      id: row.id,
      email: row.email,
      person_name:
        names.data?.find(
          (person) => person.email.toLowerCase() === row.email.toLowerCase(),
        )?.person_name ?? null,
      count: row.count,
      links: (row.clicked_links ?? []).filter((link) =>
        /^https?:\/\//i.test(link.url),
      ),
    })),
    hasMore: page.has_more,
    nextCursor: page.has_more ? page.data.at(-1)!.id : null,
    updatedAt: new Date().toISOString(),
  };
}
