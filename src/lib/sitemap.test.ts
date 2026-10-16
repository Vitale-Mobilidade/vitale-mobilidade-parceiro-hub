import { describe, expect, it } from "vitest";
import {
  buildSitemapXml,
  radarIdPaths,
  articleSlugPaths,
  STATIC_SITEMAP_PATHS,
} from "./sitemap";

describe("sitemap builder", () => {
  it("exclui aliases, noindex e rotas inexistentes", () => {
    for (const p of [
      "/escolherbike",
      "/acompanhamento",
      "/calc",
      "/painel-bikes",
      "/grupodeofertas",
      "/comparar",
      "/admin",
    ]) {
      expect(STATIC_SITEMAP_PATHS as readonly string[]).not.toContain(p);
    }
    expect(STATIC_SITEMAP_PATHS as readonly string[]).not.toContain("/bikes");
    expect(STATIC_SITEMAP_PATHS).toContain("/conteudos");
    expect(STATIC_SITEMAP_PATHS).toContain("/quiz");
    expect(
      STATIC_SITEMAP_PATHS.filter((p) => p.startsWith("/calculadoras/")),
    ).toHaveLength(0);
    expect(
      STATIC_SITEMAP_PATHS.filter((p) => p.startsWith("/ferramentas/")),
    ).toEqual([
      "/ferramentas/carro-vs-bike",
      "/ferramentas/moto-vs-bike",
      "/ferramentas/aplicativos-vs-bike",
      "/ferramentas/transporte-publico-vs-bike",
      "/ferramentas/veiculo-alugado-vs-bike-propria",
      "/ferramentas/meta-entregas",
      "/ferramentas/economia-de-tempo",
    ]);
  });

  it("filtra slugs e ids inválidos e deduplica", () => {
    expect(
      radarIdPaths([
        { id: "vl20" },
        { id: "<script>" },
        { slug: "vl20-slug" },
        null,
      ]),
    ).toEqual(["/radar/vl20"]);
    expect(
      articleSlugPaths([
        { slug: "teste-v8-ultra" },
        { slug: "teste-v8-ultra" },
        { slug: "../x" },
      ]),
    ).toEqual(["/conteudos/teste-v8-ultra"]);
  });

  it("gera XML sem lastmod e escapado", () => {
    const xml = buildSitemapXml(
      ["/", "/radar", "/radar", "//evil.com", "/a&b"],
      "https://x.com",
    );
    expect(xml).toContain("<loc>https://x.com/</loc>");
    expect(xml.match(/<loc>https:\/\/x\.com\/radar<\/loc>/g)).toHaveLength(1);
    expect(xml).toContain("https://x.com/a&amp;b");
    expect(xml).not.toContain("evil.com");
    expect(xml).not.toContain("lastmod");
  });
});
