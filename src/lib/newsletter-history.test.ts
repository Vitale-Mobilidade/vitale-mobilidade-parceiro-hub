import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ResendNewsletter } from "./resend-newsletter.server";
import {
  clearNewsletterStatsCache,
  newsletterCampaignPreview,
  newsletterCampaignReports,
} from "./newsletter-history.server";
import proof from "../../artifacts/newsletter-agent-refined-proof.json";
const id = "00000000-0000-4000-8000-000000000001";
const campaign = {
  id,
  edition_day: "2026-10-08",
  resend_id: "broadcast-1",
  segment: "general",
  payload: { content: proof.content },
};
function db(owned = true) {
  return {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: [campaign], error: null }),
        }),
        eq: () => ({
          single: async () => ({
            data:
              table === "newsletter_settings"
                ? { from_email: "news@example.com" }
                : owned
                  ? campaign
                  : null,
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
function provider(tracking = true, unavailable = false) {
  const request = vi.fn(async (url: RequestInfo | URL) => {
    if (unavailable) return new Response("{}", { status: 503 });
    const path = String(url);
    return Response.json(
      path.includes("/emails/metrics?")
        ? {
            data: [
              {
                broadcast_id: "broadcast-1",
                sent: 25,
                delivered: 24,
                unique_opened: tracking ? 12 : 0,
                unique_clicked: tracking ? 3 : 0,
              },
            ],
          }
        : path.includes("/broadcasts/")
          ? { html: "<html>HTML ORIGINAL</html>", subject: "Enviada" }
          : path.includes("/domains/domain-1")
            ? { open_tracking: tracking, click_tracking: tracking }
            : {
                data: [{ id: "domain-1", name: "example.com" }],
                has_more: false,
              },
    );
  });
  const resend = new ResendNewsletter("mock", request as typeof fetch, 0);
  return { request, get: () => resend };
}
beforeEach(clearNewsletterStatsCache);
describe("newsletter history", () => {
  it("retrieves unique engagement in one batch, scoped to owned broadcasts and caches it", async () => {
    const p = provider();
    const stats = await newsletterCampaignReports(db(), p.get);
    expect(stats[id]).toMatchObject({
      available: true,
      sent: 25,
      delivered: 24,
      opened: 12,
      clicked: 3,
    });
    expect(String(p.request.mock.calls[0][0])).toContain(
      "broadcast_id=broadcast-1",
    );
    expect(String(p.request.mock.calls[0][0])).toContain("unique_opened");
    await newsletterCampaignReports(db(), p.get);
    expect(p.request).toHaveBeenCalledTimes(3);
  });
  it("does not present disabled tracking as zero opens or clicks", async () => {
    const stats = await newsletterCampaignReports(db(), provider(false).get);
    expect(stats[id]).toMatchObject({
      available: true,
      opened: null,
      clicked: null,
      openTracking: false,
    });
  });
  it("returns an explicit unavailable state on provider failure", async () => {
    const stats = await newsletterCampaignReports(
      db(),
      provider(true, true).get,
    );
    expect(stats[id].available).toBe(false);
    expect(stats[id].sent).toBeUndefined();
  });
  it("shows original provider HTML and refuses unowned campaign IDs before calling Resend", async () => {
    const p = provider();
    expect(
      await newsletterCampaignPreview(db(), p.get, {
        action: "campaign_preview",
        id,
      }),
    ).toMatchObject({ html: "<html>HTML ORIGINAL</html>", source: "provider" });
    p.request.mockClear();
    await expect(
      newsletterCampaignPreview(db(false), p.get, {
        action: "campaign_preview",
        id,
      }),
    ).rejects.toThrow("newsletter_campaign_unavailable");
    expect(p.request).not.toHaveBeenCalled();
  });
  it("falls back to a labelled snapshot with no writes or generation", async () => {
    const preview = await newsletterCampaignPreview(
      db(),
      provider(true, true).get,
      { action: "campaign_preview", id },
    );
    expect(preview.source).toBe("snapshot");
    expect(preview.html).toContain("color-scheme");
  });
});
