import { describe, expect, it } from "vitest";
import {
  sanitizeEditorialText,
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
  it("allows qualified observations, useful test evidence and guides without bikes", () => {
    expect(hasEditorialDistance("A suspensão recebeu uma impressão positiva ao longo do percurso.")).toBe(false);
    expect(hasEditorialDistance("A percepção relatada é de alguma redução de força.")).toBe(false);
    expect(hasEditorialDistance("A locação pode ser uma fonte de renda.")).toBe(false);
    expect(hasEditorialDistance("Confira a fonte de alimentação do carregador.")).toBe(false);
    expect(hasEditorialDistance("O conforto se destacou nas primeiras impressões.")).toBe(false);
    expect(
      hasEditorialDistance("Na subida com cerca de 130 kg, o painel indicou 33 km/h com auxílio dos pedais."),
    ).toBe(false);
    expect(hasEditorialDistance("Para escolher um acessório, confira sua finalidade e compatibilidade.")).toBe(false);
  });
});

describe("editorial voice — contextual source narration", () => {
  it.each([
    "Gravar vídeo durante o trajeto exige um suporte firme para a câmera.",
    "Uma câmera com boa estabilização melhora a qualidade do vídeo.",
    "A transcrição automática pode errar nomes de modelos.",
    "A FT03 foi usada em trajetos noturnos no Morumbi.",
    "Nas primeiras impressões, o banco pareceu confortável.",
    "Nas configurações avaliadas, as duas bikes usam baterias de 48 V.",
    "A suspensão recebeu uma impressão positiva no piso irregular.",
    "A percepção relatada é de redução de força nas subidas.",
    "O que o percurso urbano mostrou foi a importância da pressão dos pneus.",
    "A gravação de vídeo exige espaço no cartão de memória.",
    "Segundo a ficha do fabricante, a autonomia é de até 50 km.",
    "No teste com 130 kg, o painel indicou 33 km/h com auxílio dos pedais.",
    "Uma bike para entregas: conforto, autonomia e manutenção",
  ])("allows independent subject prose: %s", (prose) => {
    expect(hasEditorialDistance(prose)).toBe(false);
  });

  it.each([
    "O vídeo mostra como a FT03 se comporta na subida.",
    "A bike foi apresentada como uma alternativa para deslocamentos urbanos.",
    "A UFOFAST é apresentada como uma marca brasileira.",
    "O conjunto Logan foi avaliado como suficiente.",
    "As setas foram consideradas visíveis.",
    "Não foi apresentada uma classificação específica de resistência à água.",
    "A fonte sustenta a flexibilidade dos períodos de locação.",
    "A fonte não fornece custos operacionais completos.",
    "Um site próprio e marketplaces são caminhos citados.",
    "O vídeo apresenta cinco motivos para comprar uma bike elétrica.",
    "Neste vídeo, o apresentador explica o conforto da bike.",
    "Nesse vídeo acompanhamos o trajeto noturno.",
    "Durante o vídeo, a bike percorre ruas do Morumbi.",
    "A gravação relata as impressões do condutor.",
    "O motor é apresentado no vídeo como silencioso.",
    "Os resultados foram mencionados na transcrição.",
    "Segundo a transcrição, o percurso foi feito à noite.",
    "De acordo com o vídeo, a bike tem bom conforto.",
    "A transcrição descreve um passeio no Morumbi.",
    "O material fornecido destaca a suspensão.",
    "O material analisado aponta 50 km.",
    "Na avaliação da Vitale, a bike mostrou boa autonomia.",
    "As informações fornecidas pelo vídeo indicam boa autonomia.",
    "O apresentador relata que a suspensão é confortável.",
    "Quem conduzia achou o banco confortável.",
    "O VÍDEO\n  MOSTRA a bike durante o trajeto.",
    "O **vídeo** mostra a bike durante o trajeto.",
    "Segundo a\n_transcrição_, a bike percorreu ruas do Morumbi.",
  ])("flags explicit source narration: %s", (prose) => {
    expect(hasEditorialDistance(prose)).toBe(true);
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


describe("preços com separadores não deixam fragmentos", () => {
  it("remove a frase inteira com preços em milhares e preserva a próxima", () => {
    expect(sanitizeEditorialText("A oferta cita **R$ 5.959 no Pix ou R$ 6.472 parcelados em dez vezes**. Confira o anúncio atual."))
      .toBe("Confira o anúncio atual.");
  });
  it("preserva medidas e frases sem preços", () => {
    expect(sanitizeEditorialText("Motor de 1.000 W. Bateria de 15,6 Ah. Valor de R$ 6.472,50. Confira."))
      .toBe("Motor de 1.000 W. Bateria de 15,6 Ah. Confira.");
  });
  it("detecta a transcrição como narradora", () => {
    expect(hasEditorialDistance("A transcrição associa os 1.000 W a uma dispensa de burocracia." )).toBe(true);
  });
});


describe("artigo independente sem avisos sobre a fonte", () => {
  it.each(["A V9 Max foi descrita como um produto sem marca identificada.", "A configuração mencionada combina freios.", "Baseado no vídeo de origem", "A oferta citada pode mudar a qualquer momento.", "Avaliada pelo apresentador.", "A própria fonte não assegura isso.", "A transcrição confirma o motor."])("bloqueia %s", (text) => {
    expect(hasEditorialDistance(text)).toBe(true);
  });
  it("aceita análise direta com condição concreta de autonomia", () => {
    expect(hasEditorialDistance("A V9 Max leva duas pessoas e tem bateria removível. A autonomia fica entre 40 e 50 km em uso moderado.")).toBe(false);
  });
});
