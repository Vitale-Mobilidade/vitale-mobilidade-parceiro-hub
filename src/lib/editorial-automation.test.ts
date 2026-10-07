import { describe, expect, it } from "vitest";
import {
  detectArticleBikes,
  detectContentType,
  detectEditorialBikes,
  layoutArticle,
} from "../../supabase/functions/_shared/editorial-automation";
import {
  autoRepairArticle,
  blocksToMarkdown,
  hasEditorialDistance,
  markdownToSections,
  VIDEO_META_RE,
} from "../../supabase/functions/_shared/editorial-contract";

const bikes = [
  { bike_id: "v9_max", name: "V9 Max" },
  { bike_id: "v9_max_20ah", name: "V9 Max 20Ah" },
  { bike_id: "v9_max_s", name: "V9 Max S" },
  { bike_id: "v9_max_ufofast_duas_baterias", name: "V9 Max Ufofast Duas Baterias" },
  { bike_id: "v8_pro", name: "V8 Pro" },
];
const text = (heading: string) => ({ type: "text" as const, heading, text: `${heading} em detalhe.` });

describe("editorial automation", () => {
  it("detecta V9 Max na transcrição sem escolher variantes mais longas", () => {
    expect(
      detectArticleBikes(
        "Autonomia, pedal e passageiro",
        "Hoje a bordo da V9 Max modelo com 1000 W, bateria 48 V e 15,6 Ah.",
        bikes,
      ),
    ).toMatchObject({ primaryBikeId: "v9_max", relatedBikeIds: [], ambiguous: false });
  });
  it("detects the exact variant, not the shorter contained model", () => {
    const found = detectEditorialBikes("Teste da V9 Max 20Ah", "Comparando com a V8 Pro.", bikes);
    expect(found.primaryBikeId).toBe("v9_max_20ah");
    expect(found.relatedBikeIds).toContain("v8_pro");
    expect(found.relatedBikeIds).not.toContain("v9_max");
  });

  it("resolves V9 Max S vs Ufofast: first in title is primary, catalog suffix ignored", () => {
    const found = detectEditorialBikes("V9 Max S vs V9 Max Ufofast: QUAL COMPRAR?", "", bikes);
    expect(found.primaryBikeId).toBe("v9_max_s");
    expect(found.relatedBikeIds).toEqual(["v9_max_ufofast_duas_baterias"]);
    expect(found.ambiguous).toBe(false);
  });

  it("links article subjects from the title without transcript-only bikes", () => {
    expect(detectArticleBikes("Teste da V8 Pro", "Comparando com a V9 Max S.", bikes)).toEqual({
      primaryBikeId: "v8_pro",
      relatedBikeIds: [],
      ambiguous: false,
    });
    expect(detectArticleBikes("V8 Pro vs V9 Max S", "Também existe a V9 Max.", bikes).relatedBikeIds).toEqual([
      "v9_max_s",
    ]);
  });

  it("chooses content type from the video title", () => {
    expect(detectContentType("V8 Pro vs V9 Max: comparativo")).toBe("comparison");
    expect(detectContentType("Guia de compra")).toBe("guide");
  });

  it("interleaves comparison, both Radars, complementary video and Quiz before FAQ", () => {
    const blocks = layoutArticle({
      sections: ["A", "B", "C", "D", "E"].map(text),
      videoId: "pLt9AmDyJ9Q",
      bikeId: "v9_max_s",
      relatedBikeIds: ["v9_max_ufofast_duas_baterias"],
      contentType: "comparison",
      offerBikeIds: new Set(["v9_max_s", "v9_max_ufofast_duas_baterias"]),
      hasFaq: true,
    });
    const types = blocks.map((b) => b.type);
    expect(types.filter((t) => t === "radar")).toHaveLength(2);
    expect(types).toContain("comparator");
    expect(blocks.find((b) => b.type === "video")?.heading).toBe("Assista ao comparativo completo");
    expect(types).not.toContain("cta");
    expect(types.indexOf("comparator")).toBeLessThan(types.indexOf("radar"));
    expect(types.indexOf("radar")).toBeLessThan(types.lastIndexOf("text"));
    expect(types.indexOf("quiz")).toBeLessThan(types.indexOf("faq"));
    expect(types.at(-1)).toBe("faq");
    expect(JSON.stringify(blocks)).not.toMatch(/meli\.la|R\$/);
  });

  it("never adds Radar or purchase CTA without a current offer", () => {
    const blocks = layoutArticle({
      sections: [text("A"), text("B")],
      videoId: "3impuq3th8g",
      bikeId: "v9_max",
      offerBikeIds: new Set(),
      hasFaq: false,
    });
    expect(blocks.map((b) => b.type)).toEqual(["text", "text", "video", "quiz"]);
  });
});

describe("automatic QA", () => {
  const base = {
    title: "V9 Max S vs Ufofast: qual faz mais sentido?",
    slug: null,
    summary: "Duas bikes com duas baterias. Custa R$ 7.999 hoje.",
    faq: [{ question: "Tem garupa?", answer: "", sourceExcerpt: "" }],
    seo_title: "",
    meta_description: "",
    og_title: "",
    og_description: "",
    og_image_url: null,
  };
  it("drops prices, links, empty FAQ, merges untitled 'Seção' and fills SEO/OG", () => {
    const fixed = autoRepairArticle(
      { ...base, blocks: [text("Bateria"), { type: "text", heading: "Seção", text: "Veja https://x.y mais." }] },
      "https://vitalemobilidade.com/og.webp",
    );
    expect(fixed.summary).not.toMatch(/R\$/);
    expect(fixed.faq).toEqual([]);
    expect(fixed.blocks).toHaveLength(1);
    expect(fixed.blocks[0].text).not.toMatch(/https?:/);
    expect(fixed.slug).toBe("v9-max-s-vs-ufofast-qual-faz-mais-sentido");
    expect(fixed.seo_title.length).toBeGreaterThanOrEqual(20);
    expect(fixed.og_image_url).toContain("https://");
  });
  it("round-trips the editor body as continuous markdown", () => {
    const md = blocksToMarkdown([text("Bateria e autonomia"), text("Conforto")]);
    expect(markdownToSections(md).map((s) => s.heading)).toEqual(["Bateria e autonomia", "Conforto"]);
  });
  it("flags meta commentary about the video", () => {
    expect(VIDEO_META_RE.test("Neste vídeo mostramos a bike")).toBe(true);
    expect(VIDEO_META_RE.test("Nos testes da Vitale, a bike subiu bem")).toBe(false);
  });
  it("flags distant third-person source framing without flagging factual bike analysis", () => {
    expect(hasEditorialDistance("A VL20 é apresentada na avaliação da Vitale como outra versão.")).toBe(true);
    expect(hasEditorialDistance("Nas configurações avaliadas, as duas usam 48 V.")).toBe(false);
    expect(hasEditorialDistance("O material analisado aponta 50 km.")).toBe(true);
    expect(hasEditorialDistance("A VL20 e a V9 Pro usam baterias de 48 V; a autonomia depende do uso.")).toBe(false);
    expect(hasEditorialDistance("Segundo a ficha do fabricante, a autonomia é de até 50 km.")).toBe(false);
  });
});


it("business articles use explanatory video headings and avoid a bike-selection quiz", () => {
  const contentType = detectContentType("Como ganhar dinheiro com bicicletas elétricas: modelos de negócio");
  expect(contentType).toBe("economy");
  const blocks = layoutArticle({ sections: [{ type: "text", heading: "Revenda", text: "Receita, margem e custos." }], videoId: "abcDEFG1234", bikeId: null, contentType, offerBikeIds: new Set(), hasFaq: false });
  expect(blocks.find(block => block.type === "video")?.heading).toBe("Veja as explicações em vídeo");
  expect(blocks.some(block => block.type === "quiz")).toBe(false);
});


it("a bike video CTA does not invent a practical test", () => {
  const blocks = layoutArticle({ sections: [{ type: "text", text: "Características da bike." }], videoId: "abcDEFG1234", bikeId: "v9-max", contentType: "test", offerBikeIds: new Set(), hasFaq: false });
  expect(blocks.find(block => block.type === "video")?.heading).toBe("Veja a bike em vídeo");
});
