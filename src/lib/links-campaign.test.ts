import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it, vi } from "vitest";
import { growthRange } from "../../supabase/functions/_shared/growth-range";
import { makeSiteAnalytics } from "./site-analytics";
import { validateSiteAnalyticsHit } from "../../supabase/functions/_shared/site-analytics";

const source = readFileSync(
  new URL("../../supabase/functions/editorial-admin/index.ts", import.meta.url),
  "utf8",
);
const branch = source.slice(
  source.indexOf('    if (action === "links-campaign") {'),
  source.indexOf('    if (action === "offers-campaigns") {'),
);
async function run(
  role: string,
  body = {},
  data: unknown = [{ day: "2026-11-20", event_count: "17" }],
  failed = false,
) {
  const query: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const method of ["select", "eq", "gte", "lte", "order"])
    query[method] = vi.fn(() => query);
  query.limit = vi.fn(async () => ({ data, error: failed ? {} : null }));
  const from = vi.fn(() => query);
  const invoke = runInNewContext(`(async function(){${branch}})`, {
    actor: { role },
    body,
    action: "links-campaign",
    req: {},
    db: { from },
    growthRange,
    json: (_req: unknown, data: unknown, status = 200) => ({ data, status }),
  });
  return { response: await invoke(), from, query };
}

describe("link da bio em Campanhas", () => {
  it("coleta uma visita canônica sem query, hash ou dados pessoais", () => {
    const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    const analytics = makeSiteAnalytics("https://collector.test", true, send);
    analytics.pageView(
      "https://vitalemobilidade.com/links/?utm_source=instagram&email=private@example.com#bio",
    );
    analytics.pageView("https://vitalemobilidade.com/links");
    expect(send).toHaveBeenCalledTimes(1);
    const hit = JSON.parse(send.mock.calls[0][1].body);
    expect(hit).toEqual({ event: "page_view", sourcePath: "/links" });
    expect(validateSiteAnalyticsHit(hit)).toEqual(hit);
    expect(
      validateSiteAnalyticsHit({ ...hit, sourcePath: "/links?email=private" }),
    ).toBeNull();
  });
  it.each(["content", "operation"])(
    "não permite %s ler os agregados",
    async (role) => {
      const h = await run(role);
      expect(h.response.status).toBe(403);
      expect(h.from).not.toHaveBeenCalled();
    },
  );
  it("aplica período e path fixo, sem misturar outras campanhas", async () => {
    const h = await run(
      "admin",
      { startDate: "2026-11-19", endDate: "2026-11-20", sourcePath: "/" },
      [
        { day: "2026-11-19", event_count: "17" },
        { day: "2026-11-20", event_count: 3 },
      ],
    );
    expect(h.response.status).toBe(200);
    expect(h.response.data).toMatchObject({
      views: 20,
      startDate: "2026-11-19",
      endDate: "2026-11-20",
    });
    expect(h.from).toHaveBeenCalledWith("site_analytics_daily");
    expect(h.query.eq).toHaveBeenCalledWith("source_path", "/links");
    expect(h.query.eq).toHaveBeenCalledWith("event_name", "page_view");
    expect(h.query.gte).toHaveBeenCalledWith("day", "2026-11-19");
    expect(h.query.lte).toHaveBeenCalledWith("day", "2026-11-20");
    expect(h.query.limit).toHaveBeenCalledWith(366);
  });
  it("rejeita período inválido antes de consultar", async () => {
    const h = await run("admin", {
      startDate: "2026-11-20",
      endDate: "2026-11-19",
    });
    expect(h.response.status).toBe(400);
    expect(h.from).not.toHaveBeenCalled();
  });
  it("distingue falta de registros de falha de leitura", async () => {
    const empty = await run("admin", {}, []);
    expect(empty.response.data).toMatchObject({ views: 0, days: [] });
    expect((await run("admin", {}, null, true)).response.status).toBe(503);
    expect(
      (await run("admin", {}, [{ day: "2026-11-20", event_count: "invalid" }]))
        .response.status,
    ).toBe(503);
  });
});
