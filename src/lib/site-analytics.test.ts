import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  makeSiteAnalytics,
  siteAnalyticsClientEnabled,
} from "./site-analytics";
import {
  publicAnalyticsPath,
  siteAnalyticsStartDay,
  validateSiteAnalyticsHit,
} from "../../supabase/functions/_shared/site-analytics";

describe("site analytics contract", () => {
  it("aceita somente os três payloads mínimos e rejeita PII/campos extras", () => {
    expect(
      validateSiteAnalyticsHit({ event: "page_view", sourcePath: "/radar" }),
    ).toEqual({
      event: "page_view",
      sourcePath: "/radar",
    });
    expect(
      validateSiteAnalyticsHit({
        event: "bike_click",
        sourcePath: "/conteudos/teste",
        targetPath: "/radar/v8_ultra",
        bikeId: "v8_ultra",
      }),
    ).toBeTruthy();
    expect(
      validateSiteAnalyticsHit({
        event: "affiliate_click",
        sourcePath: "/radar/v8_ultra",
        bikeId: "v8_ultra",
        position: "radar_detail",
      }),
    ).toBeTruthy();
    expect(
      validateSiteAnalyticsHit({
        event: "page_view",
        sourcePath: "/",
        email: "pessoa@example.com",
      }),
    ).toBeNull();
    expect(
      validateSiteAnalyticsHit({
        event: "bike_click",
        sourcePath: "/",
        targetPath: "/radar/v9",
        bikeId: "v8",
      }),
    ).toBeNull();
  });

  it("aceita path público sem query/hash e exclui Admin", () => {
    expect(publicAnalyticsPath("/ferramentas/economia-de-tempo/ ")).toBeNull();
    expect(publicAnalyticsPath("/radar/v8_ultra")).toBe("/radar/v8_ultra");
    expect(publicAnalyticsPath("/radar/v8_ultra?email=x")).toBeNull();
    expect(publicAnalyticsPath("/admin/growth")).toBeNull();
    expect(publicAnalyticsPath("/api/public/newsletter-worker")).toBeNull();
    expect(publicAnalyticsPath("/reset/private-token")).toBeNull();
    expect(publicAnalyticsPath("/rota-que-nao-existe")).toBeNull();
    expect(publicAnalyticsPath("/conteudos/guia-bike-eletrica")).toBe(
      "/conteudos/guia-bike-eletrica",
    );
  });

  it("calcula exatamente N dias inclusivos no calendário de São Paulo", () => {
    expect(siteAnalyticsStartDay(new Date("2026-10-08T02:59:59Z"), 7)).toBe(
      "2026-10-01",
    );
    expect(siteAnalyticsStartDay(new Date("2026-10-08T03:00:00Z"), 7)).toBe(
      "2026-10-02",
    );
  });
});

describe("site analytics tracker", () => {
  const send = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));

  beforeEach(() => send.mockClear());

  it("habilita o cliente somente em build de produção sem override false", () => {
    expect(siteAnalyticsClientEnabled(false, undefined)).toBe(false);
    expect(siteAnalyticsClientEnabled(false, "true")).toBe(false);
    expect(siteAnalyticsClientEnabled(true, undefined)).toBe(true);
    expect(siteAnalyticsClientEnabled(true, "true")).toBe(true);
    expect(siteAnalyticsClientEnabled(true, "false")).toBe(false);
  });

  it("fica completamente inerte quando a flag cliente está desligada", () => {
    const analytics = makeSiteAnalytics("https://collector.test", false, send);
    analytics.pageView("https://vitalemobilidade.com/");
    analytics.bikeClick(
      "https://vitalemobilidade.com/",
      "https://vitalemobilidade.com/radar/v8_ultra",
    );
    analytics.affiliateClick(
      "https://vitalemobilidade.com/radar/v8_ultra",
      "v8_ultra",
      "radar_detail",
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("deduplica a mesma página, conta A-B-A e nunca envia query/hash", () => {
    const analytics = makeSiteAnalytics("https://collector.test", true, send);
    analytics.pageView("https://vitalemobilidade.com/?utm_source=private");
    analytics.pageView("https://vitalemobilidade.com/#again");
    analytics.pageView(
      "https://vitalemobilidade.com/radar?email=private@example.com",
    );
    analytics.pageView("https://vitalemobilidade.com/");
    expect(send).toHaveBeenCalledTimes(3);
    expect(
      send.mock.calls.map((call) => JSON.parse(call[1].body as string)),
    ).toEqual([
      { event: "page_view", sourcePath: "/" },
      { event: "page_view", sourcePath: "/radar" },
      { event: "page_view", sourcePath: "/" },
    ]);
  });

  it("registra clique na bike com origem e clique afiliado sem bloquear", () => {
    const analytics = makeSiteAnalytics("https://collector.test", true, send);
    expect(
      analytics.bikeClick(
        "https://vitalemobilidade.com/conteudos/guia?secret=1",
        "https://vitalemobilidade.com/radar/v8_ultra?ignored=1",
      ),
    ).toBeUndefined();
    expect(
      analytics.affiliateClick(
        "https://vitalemobilidade.com/ferramentas/economia-de-tempo",
        "v8_ultra",
        "ferramenta_economia_de_tempo",
      ),
    ).toBeUndefined();
    expect(
      send.mock.calls.map((call) => JSON.parse(call[1].body as string)),
    ).toEqual([
      {
        event: "bike_click",
        sourcePath: "/conteudos/guia",
        targetPath: "/radar/v8_ultra",
        bikeId: "v8_ultra",
      },
      {
        event: "affiliate_click",
        sourcePath: "/ferramentas/economia-de-tempo",
        bikeId: "v8_ultra",
        position: "ferramenta_economia_de_tempo",
      },
    ]);
    expect(
      send.mock.calls.every(
        (call) => call[1].keepalive === true && call[1].credentials === "omit",
      ),
    ).toBe(true);
  });

  it("ignora host externo, Admin e destino não canônico", () => {
    const analytics = makeSiteAnalytics("https://collector.test", true, send);
    analytics.pageView("https://preview.lovable.app/");
    analytics.pageView("https://vitalemobilidade.com/admin/growth");
    analytics.bikeClick(
      "https://vitalemobilidade.com/",
      "https://evil.test/radar/v8_ultra",
    );
    analytics.bikeClick(
      "https://vitalemobilidade.com/",
      "https://vitalemobilidade.com/bikes/v8-ultra",
    );
    expect(send).not.toHaveBeenCalled();
  });
});
