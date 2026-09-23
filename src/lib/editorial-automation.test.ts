import { describe, expect, it } from "vitest";
import { completeEditorialDraft, detectContentType, detectEditorialBikes, youtubeThumbnailUrl } from "../../supabase/functions/_shared/editorial-automation";

const bikes = [
  { bike_id: "v9_max", name: "V9 Max" },
  { bike_id: "v9_max_20ah", name: "V9 Max 20Ah" },
  { bike_id: "v8_pro", name: "V8 Pro" },
];

describe("editorial automation", () => {
  it("detects the exact variant in the title, not the shorter contained model", () => {
    const found = detectEditorialBikes("Teste da V9 Max 20Ah", "Comparando com a V8 Pro.", bikes);
    expect(found.primaryBikeId).toBe("v9_max_20ah");
    expect(found.relatedBikeIds).toContain("v8_pro");
    expect(found.relatedBikeIds).not.toContain("v9_max");
  });

  it("leaves a genuine comparison ambiguous for human confirmation", () => {
    const found = detectEditorialBikes("Comparativo V8 Pro vs V9 Max", "Testamos os dois modelos.", bikes);
    expect(found.ambiguous).toBe(true);
    expect(found.primaryBikeId).toBeNull();
  });

  it("chooses content type from the video title", () => {
    expect(detectContentType("V8 Pro vs V9 Max: comparativo" )).toBe("comparison");
    expect(detectContentType("Guia de compra" )).toBe("guide");
  });

  it("adds connected components without freezing a price or an affiliate URL", () => {
    const draft = completeEditorialDraft({
      title: "Teste real da V9 Max na cidade", summary: "Este teste mostra o uso da bike na cidade.",
      seoTitle: "", metaDescription: "", ogTitle: "", ogDescription: "",
      blocks: [{ type: "text", heading: "Na prática", text: "A experiência foi registrada.", sourceExcerpt: "experiência" },
        { type: "text", heading: "Vazio", text: "" }], faq: [],
      videoId: "3impuq3th8g", bikeId: "v9_max", hasCurrentOffer: true,
      ogImageUrl: youtubeThumbnailUrl("3impuq3th8g", "maxresdefault"), relatedArticleIds: [],
    });
    expect(draft.blocks.map(block => block.type)).toEqual(["text", "video", "radar", "cta"]);
    expect(draft.blocks.find(block => block.type === "video")?.videoId).toBe("3impuq3th8g");
    expect(JSON.stringify(draft)).not.toMatch(/meli\.la|R\$\s*\d/);
    expect(draft.og_image_url).toContain("maxresdefault.jpg");
  });

  it("does not create a purchase CTA without a current offer", () => {
    const draft = completeEditorialDraft({
      title: "Teste de bike sem anúncio", summary: "A bike foi testada na cidade.",
      seoTitle: "", metaDescription: "", ogTitle: "", ogDescription: "",
      blocks: [{ type: "text", heading: "Teste", text: "Uso urbano.", sourceExcerpt: "uso urbano" },
        { type: "cta", bikeId: "v9_max" }, { type: "radar", bikeId: "v9_max" }], faq: [],
      videoId: "3impuq3th8g", bikeId: "v9_max", hasCurrentOffer: false,
      ogImageUrl: null, relatedArticleIds: [],
    });
    expect(draft.blocks.map(block => block.type)).toEqual(["text", "video"]);
  });

  it("connects two real bikes in a comparison without inventing the second model", () => {
    const draft = completeEditorialDraft({
      title: "V8 Pro vs V9 Max", summary: "Comparação registrada em vídeo.",
      seoTitle: "", metaDescription: "", ogTitle: "", ogDescription: "",
      blocks: [{ type: "text", heading: "Na prática", text: "Os modelos foram comparados.", sourceExcerpt: "comparados" }], faq: [],
      videoId: "3impuq3th8g", bikeId: "v8_pro", relatedBikeIds: ["v9_max"],
      contentType: "comparison", hasCurrentOffer: false, ogImageUrl: null, relatedArticleIds: [],
    });
    expect(draft.blocks.find(block => block.type === "comparator")?.bikeId).toBe("v8_pro");
  });

  it("does not restore a commercial block deliberately removed during editing", () => {
    const draft = completeEditorialDraft({
      title: "Teste da V9 Max", summary: "Teste registrado na transcrição.",
      seoTitle: "", metaDescription: "", ogTitle: "", ogDescription: "",
      blocks: [{ type: "text", heading: "Teste", text: "Uso na cidade.", sourceExcerpt: "uso na cidade" }], faq: [],
      videoId: "3impuq3th8g", bikeId: "v9_max", hasCurrentOffer: true,
      addCommercialBlocks: false, ogImageUrl: null, relatedArticleIds: [],
    });
    expect(draft.blocks.map(block => block.type)).toEqual(["text", "video"]);
  });
});
