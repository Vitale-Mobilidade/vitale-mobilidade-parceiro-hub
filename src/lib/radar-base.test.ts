import { describe, expect, it } from "vitest";
import { legacyRadarRedirect, radarBaseFromPath } from "./radar-base";
import { radarBikeHead, radarCatalogHead } from "./radar-routes";

describe("radar base", () => {
  it("escolhe a base pela rota", () => {
    expect(radarBaseFromPath("/radar")).toBe("/radar");
    expect(radarBaseFromPath("/radar/v8_ultra")).toBe("/radar");
    expect(radarBaseFromPath("/acompanhamento/v8_ultra")).toBe("/acompanhamento");
    expect(radarBaseFromPath("/")).toBe("/radar");
    expect(radarBaseFromPath("/radarx")).toBe("/radar");
    expect(legacyRadarRedirect("/acompanhamento/v8_ultra", "?utm_source=x")).toBe("/radar/v8_ultra?utm_source=x");
    expect(legacyRadarRedirect("/acompanhamento", "")).toBe("/radar");
    expect(legacyRadarRedirect("/acompanhamento/", "")).toBe("/radar");
    expect(legacyRadarRedirect("/acompanhamentox", "")).toBeNull();
    expect(legacyRadarRedirect("/acompanhamento/a/b", "")).toBeNull();
  });
  it("canonical próprio por base", () => {
    expect(radarCatalogHead("/radar").links[0].href).toBe("https://vitalemobilidade.com/radar");
    expect(radarCatalogHead("/acompanhamento").links[0].href).toBe("https://vitalemobilidade.com/acompanhamento");
    const d = { ok: true, bike: { name: "X", currentPrice: 1000 } };
    expect(radarBikeHead("/radar", "v8_ultra", d).links[0].href).toBe("https://vitalemobilidade.com/radar/v8_ultra");
    expect(radarBikeHead("/radar", "v8_ultra", undefined).meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });
});
