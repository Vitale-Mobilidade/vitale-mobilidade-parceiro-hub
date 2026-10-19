import { describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { newsletterCampaignEngagement } from "./newsletter-engagement.server";
import { ResendNewsletter } from "./resend-newsletter.server";
const campaign = "00000000-0000-4000-8000-000000000001";
function database(sent = true) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: sent ? { resend_id: "provider-id" } : null,
            error: null,
          }),
        }),
        in: async () => ({
          data: [{ email: "person@example.com", person_name: "Pessoa Teste" }],
          error: null,
        }),
      }),
    }),
  } as unknown as SupabaseClient;
}
function provider(page: unknown, status = 200) {
  const request = vi.fn(async (_url: RequestInfo | URL) =>
    Response.json(page, { status }),
  );
  const client = new ResendNewsletter("mock", request as typeof fetch, 0);
  return { request, get: () => client };
}
describe("newsletter campaign engagement", () => {
  it("reads clicked recipients with cursor, joins names and rejects unsafe link schemes", async () => {
    const p = provider({
      has_more: true,
      data: [
        {
          id: "opaque+/=",
          email: "person@example.com",
          count: 3,
          clicked_links: [
            { url: "https://vitalemobilidade.com/radar", clicks: 2 },
            { url: "javascript:alert(1)", clicks: 1 },
          ],
        },
      ],
    });
    const result = await newsletterCampaignEngagement(database(), p.get, {
      action: "campaign_engagement",
      campaign,
      event: "clicked",
      cursor: "previous+/=",
    });
    expect(String(p.request.mock.calls[0][0])).toContain(
      "/broadcasts/provider-id/recipients?type=clicked&limit=25&after=previous%2B%2F%3D",
    );
    expect(result).toMatchObject({
      hasMore: true,
      nextCursor: "opaque+/=",
      rows: [
        {
          person_name: "Pessoa Teste",
          email: "person@example.com",
          count: 3,
          links: [{ url: "https://vitalemobilidade.com/radar", clicks: 2 }],
        },
      ],
    });
  });
  it("supports empty opened list without inventing people", async () => {
    const p = provider({ has_more: false, data: [] });
    expect(
      await newsletterCampaignEngagement(database(), p.get, {
        action: "campaign_engagement",
        campaign,
        event: "opened",
      }),
    ).toMatchObject({ rows: [], hasMore: false, nextCursor: null });
  });
  it("does not query an arbitrary provider campaign supplied by the client", async () => {
    const p = provider({});
    await expect(
      newsletterCampaignEngagement(database(false), p.get, {
        action: "campaign_engagement",
        campaign,
        event: "opened",
      }),
    ).rejects.toThrow("newsletter_campaign_not_sent");
    expect(p.request).not.toHaveBeenCalled();
  });
  it("rejects unknown filters and oversized cursors before provider calls", async () => {
    const p = provider({});
    for (const body of [
      { event: "all" },
      { event: "opened", cursor: "x".repeat(513) },
      { event: "opened", resend_id: "other" },
    ])
      await expect(
        newsletterCampaignEngagement(database(), p.get, {
          action: "campaign_engagement",
          campaign,
          ...body,
        }),
      ).rejects.toThrow();
    expect(p.request).not.toHaveBeenCalled();
  });
  it("distinguishes provider failure and malformed pages from an empty audience", async () => {
    await expect(
      newsletterCampaignEngagement(database(), provider({}, 503).get, {
        action: "campaign_engagement",
        campaign,
        event: "opened",
      }),
    ).rejects.toThrow("resend_503");
    await expect(
      newsletterCampaignEngagement(
        database(),
        provider({ has_more: true, data: [] }).get,
        { action: "campaign_engagement", campaign, event: "opened" },
      ),
    ).rejects.toThrow("invalid_resend_page");
  });
});
