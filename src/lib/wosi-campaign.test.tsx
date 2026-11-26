import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { expect, it, vi } from "vitest";
import { makeSiteAnalytics } from "./site-analytics";
import {
  publicAnalyticsPath,
  validateSiteAnalyticsHit,
} from "../../supabase/functions/_shared/site-analytics";
import { growthRange } from "../../supabase/functions/_shared/growth-range";
import { WosiCampaignResults } from "@/components/admin/WosiCampaignSummary";

it("coleta Wosi separadamente, sem query/PII e sem bloquear a navegação em falha", () => {
  const send = vi.fn().mockRejectedValue(Error("offline"));
  const analytics = makeSiteAnalytics("https://collector.test", true, send);
  expect(() =>
    analytics.wosiClick(
      "https://vitalemobilidade.com/conteudos/teste?email=private#x",
      "article",
    ),
  ).not.toThrow();
  const hit = JSON.parse(send.mock.calls[0][1].body);
  expect(hit).toEqual({
    event: "banner_click",
    campaign: "wosi",
    sourcePath: "/conteudos/teste",
    surface: "article",
  });
  expect(validateSiteAnalyticsHit(hit)).toEqual(hit);
  expect(validateSiteAnalyticsHit({ ...hit, email: "private" })).toBeNull();
  expect(validateSiteAnalyticsHit({ ...hit, campaign: "other" })).toBeNull();
  analytics.wosiClick("https://vitalemobilidade.com/admin", "site");
  analytics.wosiClick("https://evil.test/", "site");
  expect(send).toHaveBeenCalledTimes(1);
  makeSiteAnalytics("https://collector.test", false, send).wosiClick(
    "https://vitalemobilidade.com/",
    "site",
  );
  expect(send).toHaveBeenCalledTimes(1);
  expect(() =>
    makeSiteAnalytics("x", true, () => {
      throw Error("fail");
    }).wosiClick("https://vitalemobilidade.com/", "site"),
  ).not.toThrow();
});
const source = readFileSync(
  new URL("../../supabase/functions/editorial-admin/index.ts", import.meta.url),
  "utf8",
);
const branch = source.slice(
  source.indexOf('    if (action === "wosi-campaign") {'),
  source.indexOf('    if (action === "links-campaign") {'),
);
async function admin(role: string, body = {}, failed = false) {
  const rpc = vi.fn().mockResolvedValue({
    data: failed ? null : { clicks: 3 },
    error: failed ? {} : null,
  });
  const invoke = runInNewContext(`(async function(){${branch}})`, {
    actor: { role },
    body,
    action: "wosi-campaign",
    req: {},
    db: { rpc },
    growthRange,
    json: (_r: unknown, data: unknown, status = 200) => ({ data, status }),
  });
  return { response: await invoke(), rpc };
}
it.each(["content", "operation"])(
  "nega leitura da campanha para %s",
  async (role) => {
    const h = await admin(role);
    expect(h.response.status).toBe(403);
    expect(h.rpc).not.toHaveBeenCalled();
  },
);
it("limita leitura ao período validado e distingue erro de zero", async () => {
  const h = await admin("admin", {
    startDate: "2026-11-25",
    endDate: "2026-11-26",
    campaign: "other",
  });
  expect(h.rpc).toHaveBeenCalledWith("admin_wosi_campaign", {
    p_start: "2026-11-25",
    p_end: "2026-11-26",
  });
  expect(h.response.data.clicks).toBe(3);
  expect((await admin("admin", {}, true)).response.status).toBe(503);
  const bad = await admin("admin", {
    startDate: "2026-11-26",
    endDate: "2026-11-25",
  });
  expect(bad.response.status).toBe(400);
  expect(bad.rpc).not.toHaveBeenCalled();
});
it("apresenta total e superfícies sem chamar cliques de vendas", () => {
  const html = renderToStaticMarkup(
    <WosiCampaignResults
      data={{
        startDate: "2026-11-25",
        endDate: "2026-11-26",
        clicks: 3,
        surfaces: { site: 2, article: 1 },
        days: [{ date: "2026-11-26", clicks: 3 }],
      }}
    />,
  );
  expect(html).toContain("Cliques no banner");
  expect(html).toContain("Páginas gerais");
  expect(html).toContain("Artigos");
  expect(html).toContain("26/11/2026");
  expect(html).toContain("não de pessoas únicas ou vendas");
});

it("campanha mede páginas adicionais sem ampliar o tráfego Growth herdado", () => {
  const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
  const analytics = makeSiteAnalytics("collector", true, send);
  expect(publicAnalyticsPath("/sobre")).toBeNull();
  analytics.pageView("https://vitalemobilidade.com/sobre");
  expect(send).not.toHaveBeenCalled();
  analytics.wosiClick("https://vitalemobilidade.com/sobre", "site");
  const hit = JSON.parse(send.mock.calls[0][1].body);
  expect(validateSiteAnalyticsHit(hit)).toEqual(hit);
});
