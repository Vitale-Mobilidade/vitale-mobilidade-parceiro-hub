import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
  sent_at: null as string | null,
  segment: "general",
  payload: { content: proof.content },
};
function db(owned = true, campaigns = [campaign]) {
  return {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: campaigns, error: null }),
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
afterEach(() => vi.useRealTimers());
describe("newsletter history", () => {
  it("reuses performance reports for six hours and refreshes at the boundary", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.parse("2026-10-30T10:00:00-03:00");
    vi.setSystemTime(start);
    const p = provider();
    const original = await newsletterCampaignReports(db(), p.get);
    vi.setSystemTime(start + 6 * 60 * 60_000 - 1);
    expect(await newsletterCampaignReports(db(), p.get)).toEqual(original);
    expect(p.request).toHaveBeenCalledTimes(3);
    vi.setSystemTime(start + 6 * 60 * 60_000);
    const refreshed = await newsletterCampaignReports(db(), p.get);
    expect(p.request).toHaveBeenCalledTimes(6);
    expect(refreshed[id].updatedAt).toBe(new Date().toISOString());
  });
  it("refreshes a newly completed send or new broadcast without waiting six hours", async () => {
    const p = provider();
    await newsletterCampaignReports(db(), p.get);
    const completed = { ...campaign, sent_at: "2026-10-30T09:35:00Z" };
    await newsletterCampaignReports(db(true, [completed]), p.get);
    expect(p.request).toHaveBeenCalledTimes(6);
    await newsletterCampaignReports(
      db(true, [{ ...completed, resend_id: "broadcast-2" }]),
      p.get,
    );
    expect(p.request).toHaveBeenCalledTimes(9);
  });
  it("allows a failed performance query to recover after the short error cache", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const start = Date.parse("2026-10-30T10:00:00-03:00");
    vi.setSystemTime(start);
    await newsletterCampaignReports(db(), provider(true, true).get);
    const p = provider();
    vi.setSystemTime(start + 30_000);
    const recovered = await newsletterCampaignReports(db(), p.get);
    expect(recovered[id].available).toBe(true);
    expect(p.request).toHaveBeenCalledTimes(3);
  });
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

it("keeps pre-activation Vitale metrics unknown rather than retroactively presenting zero", async () => {
  const database = {
    from: (table: string) => ({
      select: () => ({
        order: () => ({
          limit: async () => ({ data: [campaign], error: null }),
        }),
        eq: () => ({
          single: async () => ({
            data: { from_email: "vitale@news.vitalemobilidade.com" },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;
  const request = vi.fn(async (url: RequestInfo | URL) =>
    Response.json(
      String(url).includes("/emails/metrics?")
        ? {
            data: [
              {
                broadcast_id: "broadcast-1",
                sent: 25,
                delivered: 24,
                unique_opened: 0,
                unique_clicked: 0,
              },
            ],
          }
        : String(url).includes("/domains/domain-1")
          ? { open_tracking: true, click_tracking: true }
          : {
              data: [{ id: "domain-1", name: "news.vitalemobilidade.com" }],
              has_more: false,
            },
    ),
  );
  const resend = new ResendNewsletter("mock", request as typeof fetch, 0);
  const result = await newsletterCampaignReports(database, () => resend);
  expect(result[id]).toMatchObject({
    opened: null,
    clicked: null,
    openTracking: true,
    clickTracking: true,
  });
});
