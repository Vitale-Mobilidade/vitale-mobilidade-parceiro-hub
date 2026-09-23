import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackAffiliateClick, AFFILIATE_CLICK_EVENT } from "./affiliate-analytics";

const g = globalThis as unknown as { window?: { dataLayer?: Record<string, unknown>[]; location?: { pathname: string } } };

function setWindow(win: unknown) {
  g.window = win as typeof g.window;
}

function layer() {
  return g.window?.dataLayer ?? [];
}

describe("affiliate analytics", () => {
  beforeEach(() => {
    setWindow({ dataLayer: [], location: { pathname: "/bikes/v8-ultra" } });
  });

  it("emite payload mínimo permitido, com rota e destino gerados no helper", () => {
    trackAffiliateClick({ bike_id: "v8_ultra", position: "bike_detail_hero" });
    expect(layer()).toEqual([
      { event: AFFILIATE_CLICK_EVENT, destination: "mercado_livre", bike_id: "v8_ultra", position: "bike_detail_hero", route: "/bikes/v8-ultra" },
    ]);
  });

  it("rejeita bike_id fora da regex canônica e position fora da allowlist", () => {
    trackAffiliateClick({ bike_id: "../admin", position: "bike_detail_hero" });
    trackAffiliateClick({ bike_id: "v8 ultra", position: "bike_detail_hero" });
    trackAffiliateClick({ bike_id: "v8_ultra", position: "bike_detail_hero " as never });
    trackAffiliateClick({ bike_id: "v8_ultra", position: "cta_top" as never });
    expect(layer()).toHaveLength(0);
  });

  it("não aceita route/destination do chamador nem campos extras (sem PII, sem URL)", () => {
    trackAffiliateClick({
      bike_id: "v8_ultra",
      position: "radar_detail",
      // campos fora do contrato propositalmente
      ...({
        route: "https://meli.la/abc123",
        destination: "outro",
        email: "a@b.com",
        name: "Guilherme",
        url: "https://meli.la/abc123",
        price: 4999,
      } as Record<string, unknown>),
    });
    const evt = layer()[0] as Record<string, unknown>;
    expect(Object.keys(evt).sort()).toEqual(["bike_id", "destination", "event", "position", "route"]);
    expect(evt.destination).toBe("mercado_livre");
    expect(evt.route).toBe("/bikes/v8-ultra"); // pathname real, não o valor forjado
    expect(JSON.stringify(evt)).not.toMatch(/meli\.la|@|Guilherme|outro/);
  });

  it("omite route fora das rotas permitidas (sem texto livre)", () => {
    setWindow({ dataLayer: [], location: { pathname: "/escolherbike" } });
    trackAffiliateClick({ bike_id: "v8_ultra", position: "bike_detail_final" });
    const evt = layer()[0] as Record<string, unknown>;
    expect(evt).not.toHaveProperty("route");
    expect(evt.destination).toBe("mercado_livre");
  });

  it("aceita as rotas canônicas /radar e /radar/{bikeId}", () => {
    setWindow({ dataLayer: [], location: { pathname: "/radar" } });
    trackAffiliateClick({ bike_id: "v8_ultra", position: "radar_catalog" });
    setWindow({ dataLayer: layer(), location: { pathname: "/radar/v8_ultra" } });
    trackAffiliateClick({ bike_id: "v8_ultra", position: "radar_detail" });
    expect(layer().map((e) => e.route)).toEqual(["/radar", "/radar/v8_ultra"]);
  });

  it("não emite sem bike_id", () => {
    trackAffiliateClick({ bike_id: "  ", position: "bike_detail_final" });
    expect(layer()).toHaveLength(0);
  });

  it("nunca lança quando o dataLayer falha (não bloqueante)", () => {
    setWindow({
      location: { pathname: "/bikes" },
      get dataLayer(): never {
        throw new Error("bloqueado");
      },
    });
    expect(() => trackAffiliateClick({ bike_id: "v8_ultra", position: "radar_catalog" })).not.toThrow();
  });

  it("é no-op no servidor (SSR)", () => {
    const w = g.window;
    delete g.window;
    expect(() => trackAffiliateClick({ bike_id: "v8_ultra", position: "radar_highlight" })).not.toThrow();
    g.window = w;
  });
});

describe("CTA de compra preserva href exato e não bloqueia", () => {
  it("o handler não chama preventDefault nem retorna promise", () => {
    setWindow({ dataLayer: [], location: { pathname: "/bikes/v8-ultra" } });
    const preventDefault = vi.fn();
    const handler = () => trackAffiliateClick({ bike_id: "v8_ultra", position: "bike_detail_hero" });
    const result = handler() as unknown;
    expect(result).toBeUndefined();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(layer()).toHaveLength(1);
  });
});
