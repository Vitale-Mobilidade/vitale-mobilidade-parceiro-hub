import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { ResendNewsletter } from "./resend-newsletter.server";
import type { NewsletterCampaignStats } from "./newsletter-api";
import {
  renderResendNewsletter,
  type NewsletterContent,
  type NewsletterSegment,
} from "./newsletter";

// Provisioning verified in Resend on 19/10/2026, 12:28 São Paulo.
// Earlier Vitale broadcasts did not contain tracking pixels/links.
const VITALE_TRACKING_SINCE = Date.parse("2026-10-19T15:28:00Z");
type Reports = Record<string, NewsletterCampaignStats>;
let cache: { key: string; expires: number; value: Reports } | null = null;
let inFlight: { key: string; value: Promise<Reports> } | null = null;
export function clearNewsletterStatsCache() {
  cache = null;
  inFlight = null;
}
export async function newsletterCampaignReports(
  db: SupabaseClient,
  provider: () => ResendNewsletter,
) {
  const { data, error } = await db
    .from("newsletter_campaigns")
    .select("id,edition_day,resend_id,sent_at")
    .order("edition_day", { ascending: false })
    .limit(20);
  if (error) throw new Error("newsletter_database_failed");
  const campaigns = (data ?? []) as {
    id: string;
    edition_day: string;
    resend_id: string | null;
    sent_at?: string | null;
  }[];
  const sent = campaigns.filter((c) => c.resend_id);
  if (!sent.length) return {};
  const key = sent.map((c) => c.resend_id).join(",");
  if (cache?.key === key && cache.expires > Date.now()) return cache.value;
  if (inFlight?.key === key) return inFlight.value;
  const fetchReports = async (): Promise<Reports> => {
    const result: Reports = Object.fromEntries(
      campaigns.map((c) => [
        c.id,
        {
          available: false,
          reason: c.resend_id ? "provider_unavailable" : "not_sent",
        },
      ]),
    );
    try {
      const resend = provider();
      const params = new URLSearchParams({
        start_date: sent.map((c) => c.edition_day).sort()[0],
        end_date: new Date().toISOString(),
        broadcast_id: key,
        dimensions: "broadcast",
        metrics: "sent,delivered,unique_opened,unique_clicked",
      });
      const report = await resend.call<{
        data?: {
          broadcast_id: string;
          sent: number;
          delivered: number;
          unique_opened: number;
          unique_clicked: number;
        }[];
      }>(`/emails/metrics?${params}`);
      if (!Array.isArray(report.data))
        throw new Error("invalid_resend_metrics");
      let isVitaleDomain = false;
      let openTracking: boolean | null = null,
        clickTracking: boolean | null = null;
      try {
        const { data: settings } = await db
          .from("newsletter_settings")
          .select("from_email")
          .eq("singleton", true)
          .single();
        const domainName = settings?.from_email
          ?.split("@")
          .at(-1)
          ?.toLowerCase();
        isVitaleDomain = domainName === "news.vitalemobilidade.com";
        const domains = await resend.list<{ id: string; name: string }>(
          "/domains",
        );
        const domain = domains.find((d) => d.name.toLowerCase() === domainName);
        if (domain) {
          const config = await resend.call<{
            open_tracking?: boolean;
            click_tracking?: boolean;
          }>(`/domains/${encodeURIComponent(domain.id)}`);
          openTracking =
            typeof config.open_tracking === "boolean"
              ? config.open_tracking
              : null;
          clickTracking =
            typeof config.click_tracking === "boolean"
              ? config.click_tracking
              : null;
        }
      } catch {
        /* Nonzero events remain usable without domain configuration access. */
      }
      for (const campaign of sent) {
        const row = report.data.find(
          (r) => r.broadcast_id === campaign.resend_id,
        );
        if (
          !row ||
          ![
            row.sent,
            row.delivered,
            row.unique_opened,
            row.unique_clicked,
          ].every((n) => typeof n === "number" && Number.isInteger(n) && n >= 0)
        )
          continue;
        const sentAt = Date.parse(
          campaign.sent_at ?? `${campaign.edition_day}T00:00:00Z`,
        );
        const trackingAtSend =
          !isVitaleDomain ||
          (Number.isFinite(sentAt) && sentAt >= VITALE_TRACKING_SINCE);
        result[campaign.id] = {
          available: true,
          sent: row.sent,
          delivered: row.delivered,
          opened:
            row.unique_opened > 0 || (openTracking === true && trackingAtSend)
              ? row.unique_opened
              : null,
          clicked:
            row.unique_clicked > 0 || (clickTracking === true && trackingAtSend)
              ? row.unique_clicked
              : null,
          openTracking,
          clickTracking,
          updatedAt: new Date().toISOString(),
        };
      }
      cache = { key, value: result, expires: Date.now() + 5 * 60_000 };
    } catch {
      cache = { key, value: result, expires: Date.now() + 30_000 };
    }
    return result;
  };
  const pending = fetchReports();
  inFlight = { key, value: pending };
  try {
    return await pending;
  } finally {
    if (inFlight?.value === pending) inFlight = null;
  }
}
export async function newsletterCampaignPreview(
  db: SupabaseClient,
  provider: () => ResendNewsletter,
  body: Record<string, unknown>,
) {
  const input = z
    .object({ action: z.literal("campaign_preview"), id: z.string().uuid() })
    .strict()
    .parse(body);
  const { data: campaign, error } = await db
    .from("newsletter_campaigns")
    .select("id,segment,resend_id,payload")
    .eq("id", input.id)
    .single();
  if (error || !campaign) throw new Error("newsletter_campaign_unavailable");
  if (campaign.resend_id) {
    try {
      const broadcast = await provider().call<{
        html?: string;
        text?: string;
        subject?: string;
      }>(`/broadcasts/${encodeURIComponent(campaign.resend_id)}`);
      if (typeof broadcast.html === "string" && broadcast.html.length)
        return {
          html: broadcast.html,
          text: broadcast.text ?? "",
          subject: broadcast.subject ?? campaign.payload.content.subject,
          source: "provider",
        };
    } catch {
      /* Preserve access to the editorial snapshot during provider outages. */
    }
  }
  return {
    ...renderResendNewsletter(
      campaign.payload.content as NewsletterContent,
      campaign.segment as NewsletterSegment,
    ),
    subject: campaign.payload.content.subject,
    source: "snapshot",
  };
}
