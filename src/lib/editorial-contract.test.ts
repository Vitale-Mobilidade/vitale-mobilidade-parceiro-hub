import { describe, expect, it } from "vitest";
import {
  parseArticleBlocks,
  parseCompilerOutput,
  slugifyEditorialTitle,
  generatedEditorialSlug,
  uniqueEditorialSlug,
  hasEditorialDistance,
  validateArticleForPublication,
  type EditorialArticle,
} from "../../supabase/functions/_shared/editorial-contract";

const transcript =
  "Neste teste da V8 Ultra, fizemos uma volta urbana de 20 km. A bike passou pela ladeira do bairro com uma pessoa. ".repeat(
    3,
  );
const draft: Pick<
  EditorialArticle,
  | "title"
  | "slug"
  | "summary"
  | "summary_source_excerpt"
  | "seo_title"
  | "meta_description"
  | "og_title"
  | "og_description"
  | "og_image_url"
  | "video_id"
  | "primary_bike_id"
  | "related_bike_ids"
  | "blocks"
  | "faq"
> = {
  title: "Teste real da V8 Ultra na cidade",
  slug: "teste-real-v8-ultra",
  summary: "Neste teste da V8 Ultra, mostramos uma volta urbana e uma subida com uma pessoa.",
  summary_source_excerpt:
    "Neste teste da V8 Ultra, fizemos uma volta urbana de 20 km. A bike passou pela ladeira do bairro com uma pessoa.",
  seo_title: "V8 Ultra na cidade: teste real | Vitale Mobilidade",
  meta_description:
    "Veja o teste real da V8 Ultra em percurso urbano e uma subida, com vídeo original e informações que ajudam na escolha da bike elétrica.",
  og_title: "Teste real da V8 Ultra",
  og_description: "Vídeo e análise editorial da Vitale Mobilidade.",
  og_image_url: "https://i.ytimg.com/vi/abcdefghijk/maxresdefault.jpg",
  video_id: "abcdefghijk",
  primary_bike_id: "v8_ultra",
  related_bike_ids: [],
  blocks: [
    {
      type: "text",
      heading: "Percurso",
      text: "Fizemos uma volta urbana de 20 km.",
      sourceExcerpt: "fizemos uma volta urbana de 20 km",
    },
    { type: "video", videoId: "abcdefghijk" },
  ],
  faq: [],
};

describe("editorial publication gate", () => {
  it("accepts a draft with body, slug and known bike — no literal excerpt required", () => {
    const withBody = {
      ...draft,
      blocks: [draft.blocks[0], { type: "text" as const, heading: "Subida", text: "Subiu bem." }],
    };
    expect(validateArticleForPublication(withBody, transcript, new Set(["v8_ultra"]))).toEqual([]);
  });
  it("blocks only when the article has no real body", () => {
    expect(validateArticleForPublication(draft, transcript, new Set(["v8_ultra"])).join(" ")).toContain("corpo");
  });
  it("blocks unknown bike IDs", () => {
    const changed = { ...draft, primary_bike_id: "not_real" };
    expect(validateArticleForPublication(changed, transcript, new Set(["v8_ultra"])).join(" ")).toContain(
      "Bike principal desconhecida",
    );
  });
});

describe("article title and expert prose", () => {
  it("uses the final article title rather than the initial video slug", () => {
    expect(
      generatedEditorialSlug("V9 Max com garupa: conforto e subidas", {
        slug: "bike-eletrica-teste-na-pratica",
        status: "draft",
        published_at: null,
      }),
    ).toBe("v9-max-com-garupa-conforto-e-subidas");
    expect(
      generatedEditorialSlug("Como escolher acessórios para pedalar", {
        slug: "meu-video",
        status: "draft",
        published_at: null,
      }),
    ).toBe("como-escolher-acessorios-para-pedalar");
  });
  it("preserves URLs that have already been published, even after unpublishing", () => {
    expect(
      generatedEditorialSlug("Outro título editorial", {
        slug: "url-compartilhada",
        status: "draft",
        published_at: "2026-09-28T12:00:00Z",
      }),
    ).toBe("url-compartilhada");
    expect(
      generatedEditorialSlug("Outro título editorial", {
        slug: "url-publicada",
        status: "published",
        published_at: null,
      }),
    ).toBe("url-publicada");
  });
  it("resolves identical titles through article identity, within slug limits", () => {
    const a = uniqueEditorialSlug("como-escolher-acessorios", "b382c13b-f5e8-4290-b9e5-247511545877");
    const b = uniqueEditorialSlug("como-escolher-acessorios", "49105672-9a6b-461e-a711-450db0cf87f9");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^como-escolher-acessorios-[a-z0-9]+$/);
    expect(uniqueEditorialSlug("a".repeat(100), "b382c13b-f5e8-4290-b9e5-247511545877").length).toBeLessThanOrEqual(
      120,
    );
  });
  it("flags review attribution while allowing useful test evidence and guides without bikes", () => {
    expect(hasEditorialDistance("A suspensão recebeu uma impressão positiva ao longo do percurso.")).toBe(true);
    expect(hasEditorialDistance("A percepção relatada é de alguma redução de força.")).toBe(true);
    expect(hasEditorialDistance("O conforto se destacou nas primeiras impressões.")).toBe(true);
    expect(
      hasEditorialDistance("Na subida com cerca de 130 kg, o painel indicou 33 km/h com auxílio dos pedais."),
    ).toBe(false);
    expect(hasEditorialDistance("Para escolher um acessório, confira sua finalidade e compatibilidade.")).toBe(false);
  });
});

describe("compiler output isolation", () => {
  it("keeps typed blocks only; ignores arbitrary HTML, links and publication status", () => {
    const result = parseCompilerOutput({
      title: "Teste da V8 Ultra",
      status: "published",
      affiliateUrl: "https://evil.test",
      blocks: [{ type: "text", text: "Texto", sourceExcerpt: "fonte", html: "<script>alert(1)</script>" }],
    });
    expect(result).not.toHaveProperty("status");
    expect(result).not.toHaveProperty("affiliateUrl");
    expect(parseArticleBlocks([{ type: "html", html: "<script>alert(1)</script>" }])).toEqual([]);
    expect(result?.blocks).toEqual([{ type: "text", text: "Texto", sourceExcerpt: "fonte" }]);
  });
  it("creates stable ASCII slugs", () => {
    expect(slugifyEditorialTitle("V8 Ultra: subida e comparação! ")).toBe("v8-ultra-subida-e-comparacao");
  });
});
