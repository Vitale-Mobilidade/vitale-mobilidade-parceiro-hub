import { describe, expect, it } from "vitest";
import { buildPageRanking, isCanonicalPublicPath, pageArea, pageLabel } from "./admin-page-analytics";

describe("Admin page analytics presentation", () => {
  it("classifies canonical public routes without changing the stored path", () => {
    expect(pageArea("/")).toBe("Home");
    expect(pageArea("/radar/v9_pro")).toBe("Radar");
    expect(pageArea("/conteudos/guia-bike-eletrica")).toBe("Conteúdo");
    expect(pageArea("/ferramentas/economia")).toBe("Ferramenta");
    expect(pageArea("/privacidade")).toBe("Institucional");
    expect(pageArea("/radar-antigo")).toBe("Outras");
    expect(pageLabel("/radar/v9_pro")).toBe("V9 pro");
  });

  it("calculates participation against all pageviews and filters locally", () => {
    const rows = buildPageRanking([
      { path: "/", views: 120 },
      { path: "/radar", views: 90 },
      { path: "/quiz", views: 30 },
    ], 300, "radar");
    expect(rows).toEqual([expect.objectContaining({
      path: "/radar",
      views: 90,
      share: 0.3,
      area: "Radar",
    })]);
    expect(buildPageRanking([{ path: "/conteudos/guia", views: 2 }], 10, "conteudo")).toHaveLength(1);
  });

  it("rejects malformed rows and never divides by zero", () => {
    expect(buildPageRanking([
      { path: "https://example.com", views: 5 },
      { path: "/quiz", views: Number.NaN },
      { path: "/radar", views: 1 },
    ], 0)).toEqual([expect.objectContaining({ path: "/radar", share: 0 })]);
  });

  it("accepts only canonical internal paths", () => {
    expect(isCanonicalPublicPath("/radar/v9_pro")).toBe(true);
    expect(isCanonicalPublicPath("//evil.example")).toBe(false);
    expect(isCanonicalPublicPath("/radar?utm=test")).toBe(false);
    expect(isCanonicalPublicPath("/radar#preco")).toBe(false);
    expect(isCanonicalPublicPath("/radar\\bike")).toBe(false);
  });

  it("orders by views with a stable path tie-break", () => {
    expect(buildPageRanking([
      { path: "/quiz", views: 2 },
      { path: "/radar", views: 3 },
      { path: "/conteudos", views: 3 },
    ], 8).map((row) => row.path)).toEqual(["/conteudos", "/radar", "/quiz"]);
  });
});
