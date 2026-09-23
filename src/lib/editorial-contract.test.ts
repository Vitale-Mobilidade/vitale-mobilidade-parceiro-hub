import { describe, expect, it } from "vitest";
import {
  parseArticleBlocks, parseCompilerOutput, slugifyEditorialTitle,
  validateArticleForPublication, type EditorialArticle,
} from "../../supabase/functions/_shared/editorial-contract";

const transcript = "Neste teste da V8 Ultra, fizemos uma volta urbana de 20 km. A bike passou pela ladeira do bairro com uma pessoa. ".repeat(3);
const draft: Pick<EditorialArticle, "title" | "slug" | "summary" | "summary_source_excerpt" | "seo_title" | "meta_description" | "og_title" | "og_description" | "og_image_url" | "video_id" | "primary_bike_id" | "related_bike_ids" | "blocks" | "faq"> = {
  title: "Teste real da V8 Ultra na cidade",
  slug: "teste-real-v8-ultra",
  summary: "Neste teste da V8 Ultra, mostramos uma volta urbana e uma subida com uma pessoa.",
  summary_source_excerpt: "Neste teste da V8 Ultra, fizemos uma volta urbana de 20 km. A bike passou pela ladeira do bairro com uma pessoa.",
  seo_title: "V8 Ultra na cidade: teste real | Vitale Mobilidade",
  meta_description: "Veja o teste real da V8 Ultra em percurso urbano e uma subida, com vídeo original e informações que ajudam na escolha da bike elétrica.",
  og_title: "Teste real da V8 Ultra",
  og_description: "Vídeo e análise editorial da Vitale Mobilidade.",
  og_image_url: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
  video_id: "abcdefghijk",
  primary_bike_id: "v8_ultra",
  related_bike_ids: [],
  blocks: [
    { type: "text", heading: "Percurso", text: "Fizemos uma volta urbana de 20 km.", sourceExcerpt: "fizemos uma volta urbana de 20 km" },
    { type: "video", videoId: "abcdefghijk" },
  ],
  faq: [],
};

describe("editorial publication gate", () => {
  it("accepts a draft with body, slug and known bike — no literal excerpt required", () => {
    const withBody = { ...draft, blocks: [draft.blocks[0], { type: "text" as const, heading: "Subida", text: "Subiu bem." }] };
    expect(validateArticleForPublication(withBody, transcript, new Set(["v8_ultra"]))).toEqual([]);
  });
  it("blocks only when the article has no real body", () => {
    expect(validateArticleForPublication(draft, transcript, new Set(["v8_ultra"])).join(" ")).toContain("corpo");
  });
  it("blocks unknown bike IDs", () => {
    const changed = { ...draft, primary_bike_id: "not_real" };
    expect(validateArticleForPublication(changed, transcript, new Set(["v8_ultra"])).join(" ")).toContain("Bike principal desconhecida");
  });
});

describe("compiler output isolation", () => {
  it("keeps typed blocks only; ignores arbitrary HTML, links and publication status", () => {
    const result = parseCompilerOutput({ title: "Teste da V8 Ultra", status: "published", affiliateUrl: "https://evil.test",
      blocks: [{ type: "text", text: "Texto", sourceExcerpt: "fonte", html: "<script>alert(1)</script>" }] });
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("affiliateUrl");
    expect(parseArticleBlocks([{ type: "html", html: "<script>alert(1)</script>" }])).toEqual([]);
    expect(result?.blocks).toEqual([{ type: "text", text: "Texto", sourceExcerpt: "fonte" }]);
  });
  it("creates stable ASCII slugs", () => {
    expect(slugifyEditorialTitle("V8 Ultra: subida e comparação! ")).toBe("v8-ultra-subida-e-comparacao");
  });
});
