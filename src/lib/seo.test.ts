import { describe, expect, it } from "vitest";
import { canonicalUrl, DEFAULT_OG_IMAGE, pageHead, serializeJsonLd } from "./seo";

describe("SEO metadata", () => {
  it("remove query e hash da URL canônica", () => {
    expect(canonicalUrl("/radar?utm_source=youtube#preco")).toBe("https://vitalemobilidade.com/radar");
  });

  it("entrega Open Graph grande e dimensionado por padrão", () => {
    const head = pageHead({ path: "/radar", title: "Radar", description: "Histórico de preços" });
    expect(head.meta).toContainEqual({ property: "og:image", content: DEFAULT_OG_IMAGE });
    expect(head.meta).toContainEqual({ property: "og:image:width", content: "1200" });
    expect(head.meta).toContainEqual({ property: "og:image:height", content: "630" });
    expect(head.meta).toContainEqual({ name: "twitter:image:alt", content: "Radar" });
  });

  it("preserva imagem específica de entidade sem duplicar a imagem padrão", () => {
    const image = "https://i.ytimg.com/vi/exemplo/maxresdefault.jpg";
    const head = pageHead({
      path: "/conteudos/exemplo",
      title: "Exemplo",
      description: "Descrição",
      image: { url: image, width: 1280, height: 720, type: "image/jpeg", alt: "Imagem do artigo" },
    });
    expect(head.meta.filter((item) => item.property === "og:image")).toEqual([{ property: "og:image", content: image }]);
    expect(head.meta).toContainEqual({ property: "og:image:alt", content: "Imagem do artigo" });
  });

  it("escapa marcação dinâmica em JSON-LD", () => {
    expect(serializeJsonLd({ title: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});
