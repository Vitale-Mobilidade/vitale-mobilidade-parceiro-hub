import { describe, expect, it } from "vitest";
import { detectContentType, detectEditorialBikes, layoutArticle } from "../../supabase/functions/_shared/editorial-automation";
import { autoRepairArticle, blocksToMarkdown, markdownToSections, VIDEO_META_RE } from "../../supabase/functions/_shared/editorial-contract";

const bikes = [
  { bike_id: "v9_max", name: "V9 Max" },
  { bike_id: "v9_max_20ah", name: "V9 Max 20Ah" },
  { bike_id: "v9_max_s", name: "V9 Max S" },
  { bike_id: "v9_max_ufofast_duas_baterias", name: "V9 Max Ufofast Duas Baterias" },
  { bike_id: "v8_pro", name: "V8 Pro" },
];
const text = (heading: string) => ({ type: "text" as const, heading, text: `${heading} em detalhe.` });

describe("editorial automation", () => {
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

  it("chooses content type from the video title", () => {
    expect(detectContentType("V8 Pro vs V9 Max: comparativo")).toBe("comparison");
    expect(detectContentType("Guia de compra")).toBe("guide");
  });

  it("lays out a comparison with table, both Radars, video, offer, FAQ and Quiz", () => {
    const blocks = layoutArticle({ sections: ["A", "B", "C", "D", "E"].map(text), videoId: "pLt9AmDyJ9Q",
      bikeId: "v9_max_s", relatedBikeIds: ["v9_max_ufofast_duas_baterias"], contentType: "comparison",
      offerBikeIds: new Set(["v9_max_s", "v9_max_ufofast_duas_baterias"]), hasFaq: true });
    const types = blocks.map(b => b.type);
    expect(types.filter(t => t === "radar")).toHaveLength(2);
    expect(types).toContain("comparator");
    expect(blocks.find(b => b.type === "video")?.heading).toBe("Assista ao comparativo completo");
    expect(types.slice(-3)).toEqual(["cta", "faq", "quiz"]);
    expect(JSON.stringify(blocks)).not.toMatch(/meli\.la|R\$/);
  });

  it("never adds Radar or purchase CTA without a current offer", () => {
    const blocks = layoutArticle({ sections: [text("A"), text("B")], videoId: "3impuq3th8g", bikeId: "v9_max",
      offerBikeIds: new Set(), hasFaq: false });
    expect(blocks.map(b => b.type)).toEqual(["text", "text", "video", "quiz"]);
  });
});

describe("automatic QA", () => {
  const base = { title: "V9 Max S vs Ufofast: qual faz mais sentido?", slug: null, summary: "Duas bikes com duas baterias. Custa R$ 7.999 hoje.",
    faq: [{ question: "Tem garupa?", answer: "", sourceExcerpt: "" }], seo_title: "", meta_description: "", og_title: "", og_description: "", og_image_url: null };
  it("drops prices, links, empty FAQ, merges untitled 'Seção' and fills SEO/OG", () => {
    const fixed = autoRepairArticle({ ...base, blocks: [text("Bateria"), { type: "text", heading: "Seção", text: "Veja https://x.y mais." }] }, "https://vitalemobilidade.com/og.webp");
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
    expect(markdownToSections(md).map(s => s.heading)).toEqual(["Bateria e autonomia", "Conforto"]);
  });
  it("flags meta commentary about the video", () => {
    expect(VIDEO_META_RE.test("Neste vídeo mostramos a bike")).toBe(true);
    expect(VIDEO_META_RE.test("Nos testes da Vitale, a bike subiu bem")).toBe(false);
  });
});
