import { describe, expect, it } from "vitest";
import { HOME_PRODUCTS } from "@/components/home/home-products";
import { SITE_NAV } from "@/components/site/site-ui";
import { parseCompare, radarCompareHref } from "@/lib/bike-compare";

describe("taxonomia pública do ecossistema", () => {
  it("mantém o header focado nos três hubs e no CTA do Quiz", () => {
    expect(SITE_NAV.map(({ label, to }) => [label, to])).toEqual([
      ["Radar", "/radar"],
      ["Conteúdos", "/conteudos"],
      ["Ferramentas", "/ferramentas"],
    ]);
    expect(SITE_NAV.some(({ label }) => label === "Bikes")).toBe(false);
  });

  it("conecta os cinco atalhos da Home apenas a produtos funcionais", () => {
    expect(HOME_PRODUCTS.map(({ key, to }) => [key, to])).toEqual([
      ["comparar", "/radar"],
      ["radar", "/radar"],
      ["calculadora", "/calculadoras/economia"],
      ["conteudos", "/conteudos"],
      ["grupo", "/grupodeofertas"],
    ]);
  });

  it("mantém a comparação como estado validado do Radar", () => {
    expect(parseCompare("V8_ULTRA,v9_max,v8_ultra,invalido!")).toEqual([
      "v8_ultra",
      "v9_max",
    ]);
    expect(radarCompareHref(["v8_ultra", "v9_max"])).toBe(
      "/radar?compare=v8_ultra%2Cv9_max",
    );
    expect(radarCompareHref([])).toBe("/radar");
  });
});
