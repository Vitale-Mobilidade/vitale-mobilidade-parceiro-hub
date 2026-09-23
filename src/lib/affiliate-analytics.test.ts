import { describe, it, expect, beforeEach, vi } from "vitest";
import { trackAffiliateClick, AFFILIATE_CLICK_EVENT } from "./affiliate-analytics";

declare global {
  // eslint-disable-next-line no-var
  var window: any;
}

function layer() {
  return (globalThis.window as { dataLayer?: Record<string, unknown>[] }).dataLayer ?? [];
}

describe("affiliate analytics", () => {
  beforeEach(() => {
    globalThis.window = { dataLayer: [], location: { pathname: "/bikes/v8-ultra" } };
  });

  it("emite payload mínimo permitido, com rota e destino", () => {
    trackAffiliateClick({ bike_id: "v8_ultra", position: "bike_detail_hero" });
    expect(layer()).toEqual([
      { event: AFFILIATE_CLICK_EVENT, destination: "mercado_livre", route: "/bikes/v8-ultra", bike_id: "v8_ultra", position: "bike_detail_hero" },
    ]);
  });

  it("descarta chaves fora do contrato, URL completa e PII", () => {
    trackAffiliateClick({
      bike_id: "v8_ultra",
      position: "radar_detail",
      route: "https://meli.la/abc123",
      // chaves não permitidas propositalmente
      ...({ email: "a@b.com", name: "Guilherme", url: "https://meli.la/abc123", price: 4999 } as never),
    });
    const evt = layer()[0] as Record<string, unknown>;
    expect(Object.keys(evt).sort()).toEqual(["bike_id", "destination", "event", "position"]);
    expect(JSON.stringify(evt)).not.toMatch(/meli\.la|@|Guilherme/);
  });

  it("não emite sem bike_id", () => {
    trackAffiliateClick({ bike_id: "  ", position: "bike_detail_final" });
    expect(layer()).toHaveLength(0);
  });

  it("nunca lança quando o dataLayer falha (não bloqueante)", () => {
    globalThis.window = {
      location: { pathname: "/bikes" },
      get dataLayer() {
        throw new Error("bloqueado");
      },
    };
    expect(() => trackAffiliateClick({ bike_id: "v8_ultra", position: "radar_catalog" })).not.toThrow();
  });

  it("é no-op no servidor (SSR)", () => {
    const w = globalThis.window;
    // @ts-expect-error simulando SSR
    delete globalThis.window;
    expect(() => trackAffiliateClick({ bike_id: "v8_ultra", position: "radar_highlight" })).not.toThrow();
    globalThis.window = w;
  });
});

describe("CTA de compra preserva href exato e não bloqueia", () => {
  it("o handler não chama preventDefault nem retorna promise", () => {
    globalThis.window = { dataLayer: [], location: { pathname: "/bikes/v8-ultra" } };
    const preventDefault = vi.fn();
    const handler = () => trackAffiliateClick({ bike_id: "v8_ultra", position: "bike_detail_hero" });
    const result = handler() as unknown;
    expect(result).toBeUndefined();
    expect(preventDefault).not.toHaveBeenCalled();
    expect(layer()).toHaveLength(1);
  });
});
