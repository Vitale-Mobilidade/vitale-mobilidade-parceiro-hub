import { describe, expect, it } from "vitest";
import { legacyRedirect, legacyToolsRedirect } from "./legacy-redirects";

describe("redirects legados", () => {
  it("QR Codes do Quiz antigo vão para a Home preservando query literal", () => {
    expect(legacyRedirect("/escolherbike", "")).toBe("/");
    expect(
      legacyRedirect(
        "/escolherbike/",
        "?utm_source=YouTube&utm_content=Bike%2BTeste&x=1&x=2",
      ),
    ).toBe("/?utm_source=YouTube&utm_content=Bike%2BTeste&x=1&x=2");
    for (const path of [
      "/quiz",
      "/",
      "/escolherbike-extra",
      "/escolherbike/resultado",
    ]) {
      expect(legacyRedirect(path, "")).toBeNull();
    }
  });
  it("/calc e /calc/ vão para /ferramentas preservando query", () => {
    expect(legacyToolsRedirect("/calc", "")).toBe("/ferramentas");
    expect(legacyToolsRedirect("/calc/", "?utm_source=yt&x=1")).toBe(
      "/ferramentas?utm_source=yt&x=1",
    );
  });
  it("não captura rotas vizinhas", () => {
    expect(legacyToolsRedirect("/calculadoras/economia", "")).toBeNull();
    expect(legacyToolsRedirect("/calc/economia", "")).toBeNull();
    expect(legacyToolsRedirect("/ferramentas", "")).toBeNull();
  });
  it("mantém o redirect do Radar com bikeId e query", () => {
    expect(legacyRedirect("/acompanhamento/v8_ultra", "?utm_source=x")).toBe(
      "/radar/v8_ultra?utm_source=x",
    );
    expect(legacyRedirect("/acompanhamento", "")).toBe("/radar");
    expect(legacyRedirect("/calc", "?a=1")).toBe("/ferramentas?a=1");
    expect(legacyRedirect("/bikes", "")).toBeNull();
  });
});
