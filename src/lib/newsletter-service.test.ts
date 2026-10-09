import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
const { createClient } = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient }));
vi.mock("./newsletter-sources.server", () => ({
  automaticNewsletter: vi.fn(),
}));
import {
  newsletterTick,
  newsletterAdmin,
  processNewsletterCampaign,
  type NewsletterSettings,
} from "./newsletter-service.server";
import { automaticNewsletter } from "./newsletter-sources.server";
import { ResendNewsletter } from "./resend-newsletter.server";
const id = "00000000-0000-0000-0000-000000000001";
const content = {
  subject: "Vitale",
  intro: "Destaques",
  articles: [
    { title: "Artigo", url: "https://vitalemobilidade.com/conteudos/mock" },
  ],
  bike: { title: "V9", url: "https://vitalemobilidade.com/radar/v9_max" },
  videos: [{ title: "Vídeo", url: "https://www.youtube.com/watch?v=abc" }],
};
const config: NewsletterSettings = {
  enabled: true,
  from_email: "newsletter@news.hotpipe.com.br",
  reply_to: "guilherme@hotpipe.com.br",
  segments: { general: id },
  last_error: null,
};
const campaign = {
  id,
  edition_day: "2026-10-08",
  segment: "general" as const,
  status: "syncing",
  payload: { content },
  resend_id: null,
};
const json = (body: unknown) => new Response(JSON.stringify(body));
function fakeDb(withRecipient = false) {
  const updates: { table: string; change: Record<string, unknown> }[] = [];
  let synced = false;
  const recipient = {
    id,
    person_name: "Mock",
    email: "mock@example.com",
    resend_contact_id: id,
    consent_at: "2026-10-07T12:00:00Z",
    synced: false,
  };
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({ single: async () => ({ data: config, error: null }) }),
    }),
    update: (change: Record<string, unknown>) => {
      updates.push({ table, change });
      if (table === "newsletter_recipients" && change.synced === true)
        synced = true;
      const chain = {
        eq: () => chain,
        then: (resolve: (x: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return chain;
    },
  }));
  const rpc = vi.fn((name: string) =>
    Promise.resolve({
      data:
        name === "newsletter_renew"
          ? true
          : name === "newsletter_live_recipients"
            ? withRecipient
              ? [{ ...recipient, synced }]
              : []
            : null,
      error: null,
    }),
  );
  return { db: { from, rpc } as unknown as SupabaseClient, updates };
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "synthetic-only");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
describe("newsletter authorization and dispatch recovery", () => {
  it("rejects unsigned worker requests before database access", async () => {
    expect(
      (
        await newsletterTick(
          new Request("https://example.invalid", { method: "POST" }),
        )
      ).status,
    ).toBe(403);
    expect(createClient).not.toHaveBeenCalled();
  });
  it("rejects an invalid scheduler signature before claiming the queue", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: false, error: null });
    createClient.mockReturnValue({ rpc });
    const request = new Request("https://example.invalid", {
      method: "POST",
      headers: {
        "x-worker-signature": "bad",
        "x-worker-issued-at": "1791403200",
      },
    });
    expect((await newsletterTick(request)).status).toBe(403);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("prevents a content editor from accessing newsletter administration", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: { role: "content", active: true },
      error: null,
    });
    const chain = { select: () => chain, eq: () => chain, maybeSingle };
    createClient.mockReturnValue({
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({ data: { user: { id } }, error: null }),
      },
      from: vi.fn().mockReturnValue(chain),
    });
    const response = await newsletterAdmin(
      new Request("https://example.invalid", {
        headers: { Authorization: "Bearer synthetic" },
      }),
    );
    expect(response.status).toBe(403);
  });
  it("returns paginated people only after admin authorization, without dispatching", async () => {
    const chain = {
      select: () => chain,
      eq: () => chain,
      maybeSingle: async () => ({
        data: { role: "admin", active: true },
        error: null,
      }),
    };
    const rpc = vi.fn().mockResolvedValue({
      data: { rows: [], total: 0, page: 0 },
      error: null,
    });
    createClient.mockReturnValue({
      auth: { getUser: async () => ({ data: { user: { id } }, error: null }) },
      from: () => chain,
      rpc,
    });
    const response = await newsletterAdmin(
      new Request("https://example.invalid", {
        method: "POST",
        headers: { Authorization: "Bearer synthetic" },
        body: JSON.stringify({ action: "people", filter: "all", page: 0 }),
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(rpc).toHaveBeenCalledExactlyOnceWith("newsletter_people", {
      p_filter: "all",
      p_campaign: null,
      p_page: 0,
    });
    const bad = await newsletterAdmin(
      new Request("https://example.invalid", {
        method: "POST",
        headers: { Authorization: "Bearer synthetic" },
        body: JSON.stringify({ action: "people", filter: "all", page: -1 }),
      }),
    );
    expect(bad.status).toBe(400);
    expect(rpc).toHaveBeenCalledTimes(1);
  });
  it("reconciles an already submitted campaign without another send", async () => {
    const { db, updates } = fakeDb();
    const request = vi
      .fn()
      .mockResolvedValue(
        json({ status: "sent", sent_at: "2026-10-08T13:05:00Z" }),
      );
    await processNewsletterCampaign(
      db,
      new ResendNewsletter("test", request, 0),
      config,
      { ...campaign, status: "submitting", resend_id: id },
      "lease",
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][1].method).toBe("GET");
    expect(updates.some((x) => x.change.status === "sent")).toBe(true);
  });
  it("blocks unknown creation outcomes instead of creating a second broadcast", async () => {
    const { db, updates } = fakeDb();
    const request = vi.fn();
    await processNewsletterCampaign(
      db,
      new ResendNewsletter("test", request, 0),
      config,
      { ...campaign, status: "creating" },
      "lease",
    );
    expect(request).not.toHaveBeenCalled();
    expect(updates.some((x) => x.change.status === "uncertain")).toBe(true);
    expect(
      updates.some(
        (x) => x.table === "newsletter_settings" && x.change.enabled === false,
      ),
    ).toBe(true);
  });
  it("pauses after a lost create response and keeps the frozen edition for reconciliation", async () => {
    const { db, updates } = fakeDb(true);
    const contact = {
      id,
      email: "mock@example.com",
      first_name: "Mock",
      unsubscribed: false,
    };
    const request = vi.fn(async (url: string, init: RequestInit) => {
      if (url.endsWith(`/segments/${id}`))
        return json({ id, name: "Vitale newsletter" });
      if (url.includes("/contacts/mock%40example.com")) return json(contact);
      if (url.includes(`/segments/${id}/contacts`))
        return json({ data: [contact], has_more: false });
      if (url.endsWith("/broadcasts") && init.method === "POST")
        throw new Error("lost response");
      return json({ id });
    });
    await expect(
      processNewsletterCampaign(
        db,
        new ResendNewsletter("test", request as typeof fetch, 0),
        config,
        { ...campaign },
        "lease",
      ),
    ).rejects.toThrow("resend_network");
    expect(
      request.mock.calls.filter(
        ([u, i]) => u.endsWith("/broadcasts") && i.method === "POST",
      ),
    ).toHaveLength(1);
    expect(updates.some((x) => x.change.status === "creating")).toBe(true);
    expect(updates.some((x) => x.change.status === "uncertain")).toBe(true);
    expect(updates.some((x) => x.change.enabled === false)).toBe(true);
  });
  it.each(["general", "radar", "content"] as const)(
    "submits the %s cohort once using the same dedicated provider segment",
    async (segment) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-08T13:10:00Z"));
      const { db, updates } = fakeDb(true);
      const contact = {
        id,
        email: "mock@example.com",
        first_name: "Mock",
        unsubscribed: false,
      };
      const request = vi.fn(async (url: string, init: RequestInit) => {
        if (url.includes(`/segments/${id}/contacts`))
          return json({ data: [contact], has_more: false });
        if (url.endsWith(`/segments/${id}`) && init.method === "GET")
          return json({ id, name: "Vitale newsletter" });
        if (url.includes("/contacts/mock%40example.com")) return json(contact);
        return json({ id });
      });
      await processNewsletterCampaign(
        db,
        new ResendNewsletter("test", request as typeof fetch, 0),
        config,
        { ...campaign, segment },
        "lease",
      );
      expect(
        request.mock.calls.filter(
          ([u, i]) =>
            u.endsWith(`/broadcasts/${id}/send`) && i.method === "POST",
        ),
      ).toHaveLength(1);
      expect(updates.some((x) => x.change.status === "submitting")).toBe(true);
      expect(updates.some((x) => x.change.status === "submitted")).toBe(true);
    },
  );
  it("pauses after an uncertain send acknowledgement without retrying", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T13:10:00Z"));
    const { db, updates } = fakeDb(true);
    const contact = {
      id,
      email: "mock@example.com",
      first_name: "Mock",
      unsubscribed: false,
    };
    const request = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes(`/segments/${id}/contacts`))
        return json({ data: [contact], has_more: false });
      if (url.endsWith(`/segments/${id}`) && init.method === "GET")
        return json({ id, name: "Vitale newsletter" });
      if (url.includes("/contacts/mock%40example.com")) return json(contact);
      if (url.endsWith(`/broadcasts/${id}/send`))
        throw new Error("lost acknowledgement");
      return json({ id });
    });
    await expect(
      processNewsletterCampaign(
        db,
        new ResendNewsletter("test", request as typeof fetch, 0),
        config,
        { ...campaign },
        "lease",
      ),
    ).rejects.toThrow("resend_network");
    expect(
      request.mock.calls.filter(([u]) => u.endsWith(`/broadcasts/${id}/send`)),
    ).toHaveLength(1);
    expect(updates.some((x) => x.change.status === "uncertain")).toBe(true);
    expect(updates.some((x) => x.change.enabled === false)).toBe(true);
  });
  it("does not reset to ready when the database loses an acknowledged send", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-08T13:10:00Z"));
    const { db, updates } = fakeDb(true);
    const original = db.from.bind(db);
    db.from = ((table: string) => {
      const chain = original(table);
      if (table !== "newsletter_campaigns") return chain;
      return {
        update: (change: Record<string, unknown>) => {
          if (change.status !== "submitted") return chain.update(change);
          const rejected = {
            eq: () => rejected,
            then: (resolve: (v: unknown) => unknown) =>
              Promise.resolve({
                data: null,
                error: { code: "synthetic" },
              }).then(resolve),
          };
          return rejected;
        },
      };
    }) as typeof db.from;
    const contact = {
      id,
      email: "mock@example.com",
      first_name: "Mock",
      unsubscribed: false,
    };
    const request = vi.fn(async (url: string, init: RequestInit) => {
      if (url.includes(`/segments/${id}/contacts`))
        return json({ data: [contact], has_more: false });
      if (url.endsWith(`/segments/${id}`) && init.method === "GET")
        return json({ id, name: "Vitale newsletter" });
      if (url.includes("/contacts/mock%40example.com")) return json(contact);
      return json({ id });
    });
    await expect(
      processNewsletterCampaign(
        db,
        new ResendNewsletter("test", request as typeof fetch, 0),
        config,
        { ...campaign, resend_id: id },
        "lease",
      ),
    ).rejects.toThrow("newsletter_database_failed");
    expect(
      request.mock.calls.filter(([u]) => u.endsWith(`/broadcasts/${id}/send`)),
    ).toHaveLength(1);
    expect(updates.at(-1)?.change.status).toBe("submitting");
  });
  it("keeps the shared segment frozen while a prior broadcast is sending", async () => {
    vi.stubEnv("RESEND_API_KEY", "synthetic-only");
    vi.stubEnv("LOVABLE_API_KEY", "");
    const nextCohort = vi.fn();
    const query = {
      eq: () => query,
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({
          data: [{ ...campaign, status: "submitted", resend_id: id }],
          error: null,
        }).then(resolve),
      in: nextCohort,
    };
    const db = {
      from: vi.fn((table: string) =>
        table === "newsletter_settings"
          ? {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: config, error: null }),
                }),
              }),
            }
          : { select: () => query },
      ),
      rpc: vi.fn(async (name: string) => ({
        data:
          name === "newsletter_authorize"
            ? true
            : name === "newsletter_acquire"
              ? id
              : null,
        error: null,
      })),
    };
    createClient.mockReturnValue(db);
    const request = vi.fn(async (url: string) => {
      if (url.includes("/domains?"))
        return json({
          data: [{ id, name: "news.hotpipe.com.br", status: "verified" }],
          has_more: false,
        });
      if (url.includes(`/domains/${id}`))
        return json({ capabilities: { sending: "enabled" } });
      return json({ status: "sending" });
    });
    vi.stubGlobal("fetch", request);
    const response = await newsletterTick(
      new Request("https://example.invalid", {
        method: "POST",
        headers: {
          "x-worker-signature": "synthetic",
          "x-worker-issued-at": "1791403200",
        },
      }),
    );
    expect(await response.json()).toEqual({ ok: true, waiting: true });
    expect(nextCohort).not.toHaveBeenCalled();
    expect(request.mock.calls).toHaveLength(3);
    expect(db.rpc).toHaveBeenLastCalledWith("newsletter_release", { tok: id });
  });
  it("does not regenerate a paid edition on later ticks after all cohorts exist", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-08T13:10:00Z"));
    vi.stubEnv("RESEND_API_KEY", "synthetic-only");
    vi.stubEnv("LOVABLE_API_KEY", "");
    const db = {
      from: (table: string) =>
        table === "newsletter_settings"
          ? {
              select: () => ({
                eq: () => ({
                  single: async () => ({ data: config, error: null }),
                }),
              }),
            }
          : {
              select: (columns: string) => {
                const result =
                  columns === "segment,payload,fingerprint"
                    ? ["general", "radar", "content"].map((segment) => ({
                        segment,
                        payload: { content },
                        fingerprint: "saved",
                      }))
                    : [];
                const chain = {
                  eq: () => chain,
                  in: () => chain,
                  order: () => chain,
                  limit: () => chain,
                  then: (resolve: (value: unknown) => unknown) =>
                    Promise.resolve({ data: result, error: null }).then(
                      resolve,
                    ),
                };
                return chain;
              },
            },
      rpc: vi.fn(async (name: string) => ({
        data:
          name === "newsletter_authorize"
            ? true
            : name === "newsletter_acquire"
              ? id
              : null,
        error: null,
      })),
    };
    createClient.mockReturnValue(db);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.includes("/domains?")
          ? json({
              data: [{ id, name: "news.hotpipe.com.br", status: "verified" }],
              has_more: false,
            })
          : json({ capabilities: { sending: "enabled" } }),
      ),
    );
    const response = await newsletterTick(
      new Request("https://example.invalid", {
        method: "POST",
        headers: {
          "x-worker-signature": "synthetic",
          "x-worker-issued-at": "1791403200",
        },
      }),
    );
    expect(await response.json()).toEqual({ ok: true, prepared: false });
    expect(automaticNewsletter).not.toHaveBeenCalled();
    expect(
      db.rpc.mock.calls.some(([name]) => name === "newsletter_form_campaign"),
    ).toBe(false);
  });
});

it("signed preview uses the real writer with automation paused and never calls Resend or creates campaigns", async () => {
  const settingsChain = {
    eq: () => ({
      single: async () => ({
        data: { ...config, enabled: false },
        error: null,
      }),
    }),
  };
  const historyChain: Record<string, unknown> = {};
  historyChain.in = () => historyChain;
  historyChain.order = () => historyChain;
  historyChain.range = async () => ({ data: [], error: null });
  const from = vi.fn((table: string) => ({
    select: () =>
      table === "newsletter_settings" ? settingsChain : historyChain,
  }));
  const rpc = vi.fn(async (name: string) => ({
    data:
      name === "newsletter_authorize"
        ? true
        : name === "newsletter_acquire"
          ? id
          : name === "newsletter_next_edition_number"
            ? 1
            : null,
    error: null,
  }));
  createClient.mockReturnValue({ from, rpc });
  const request = vi.fn();
  vi.stubGlobal("fetch", request);
  vi.mocked(automaticNewsletter).mockResolvedValue({
    content: {
      ...content,
      headline: "Um giro de conteúdo da Vitale",
      editionNumber: 1,
    },
    fingerprint: "mock",
  });
  const out = await newsletterTick(
    new Request("https://example.invalid", {
      method: "POST",
      headers: {
        "x-worker-signature": "synthetic",
        "x-worker-issued-at": "1",
        "x-newsletter-mode": "preview",
      },
    }),
  );
  expect(out.status).toBe(200);
  expect(await out.json()).toMatchObject({ ok: true, preview: true });
  expect(request).not.toHaveBeenCalled();
  expect(rpc).not.toHaveBeenCalledWith(
    "newsletter_form_campaign",
    expect.anything(),
  );
  expect(rpc).toHaveBeenCalledWith("newsletter_release", { tok: id });
  expect(
    from.mock.calls.every(([table]) =>
      ["newsletter_settings", "newsletter_campaigns"].includes(table),
    ),
  ).toBe(true);
});
it("unsigned preview is rejected before writer or database access", async () => {
  const result = await newsletterTick(
    new Request("https://example.invalid", {
      method: "POST",
      headers: { "x-newsletter-mode": "preview" },
    }),
  );
  expect(result.status).toBe(403);
  expect(createClient).not.toHaveBeenCalled();
  expect(automaticNewsletter).not.toHaveBeenCalled();
});
