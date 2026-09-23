import { describe, expect, it } from "vitest";
import { radarBaseFromPath } from "./radar-base";
import { radarBikeHead, radarCatalogHead } from "./radar-routes";

describe("radar base", () => {
  it("escolhe a base pela rota", () => {
    expect(radarBaseFromPath("/radar")).toBe("/radar");
    expect(radarBaseFromPath("/radar/v8_ultra")).toBe("/radar");
    expect(radarBaseFromPath("/acompanhamento/v8_ultra")).toBe("/acompanhamento");
    expect(radarBaseFromPath("/")).toBe("/acompanhamento");
    expect(radarBaseFromPath("/radarx")).toBe("/acompanhamento");
  });
  it("canonical próprio por base", () => {
    expect(radarCatalogHead("/radar").links[0].href).toBe("https://vitalemobilidade.com/radar");
    expect(radarCatalogHead("/acompanhamento").links[0].href).toBe("https://vitalemobilidade.com/acompanhamento");
    const d = { ok: true, bike: { name: "X", currentPrice: 1000 } };
    expect(radarBikeHead("/radar", "v8_ultra", d).links[0].href).toBe("https://vitalemobilidade.com/radar/v8_ultra");
    expect(radarBikeHead("/radar", "v8_ultra", undefined).meta).toContainEqual({ name: "robots", content: "noindex, follow" });
  });
});
