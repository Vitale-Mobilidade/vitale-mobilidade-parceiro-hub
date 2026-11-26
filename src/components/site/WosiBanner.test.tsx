import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { WosiBanner } from "./WosiBanner";
import { SiteFooter } from "./site-ui";
import { ArticleView, type PublishedArticle } from "../editorial/ArticleView";

const state = vi.hoisted(() => ({ path: "/radar" }));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
  useLoaderData: () => ({ footerVideos: [] }),
  useRouterState: ({ select }: { select: (s: unknown) => unknown }) =>
    select({ location: { pathname: state.path } }),
}));
vi.mock("./NewsletterSignup", () => ({ NewsletterSignup: () => null }));

const article = {
  id: "test",
  slug: "test",
  title: "Teste de artigo",
  summary: "Resumo editorial",
  blocks: [{ type: "text", text: "Último parágrafo editorial." }],
  faq: [],
  relatedBikeIds: [],
  relatedArticleIds: [],
  primaryBikeId: null,
  videoId: "",
  ogImageUrl: null,
} as unknown as PublishedArticle;

describe("publicidade Wosi", () => {
  it("entrega link comercial direto, imagem responsiva e alternativa sem movimento em SSR", () => {
    const html = renderToStaticMarkup(<WosiBanner />);
    expect(html).toContain(
      'href="https://wosi.com.br/mobilidade-eletrica/multimarcas?cupom=VITALE"',
    );
    expect(html).toContain('rel="sponsored noopener noreferrer"');
    expect(html).toContain("prefers-reduced-motion: reduce");
    expect(html).toContain("site-mobile.gif");
    expect(html).toContain("site-desktop.gif");
    expect(html).toContain("Pausar animação");
  });
  it.each([
    "/radar",
    "/radar/v9_max",
    "/quiz",
    "/conteudos",
    "/conteudos/",
    "/ferramentas",
    "/sobre",
  ])("inclui anúncio geral no rodapé de %s", (path) => {
    state.path = path;
    expect(renderToStaticMarkup(<SiteFooter />)).toContain("site-desktop.gif");
  });
  it.each([
    "/",
    "/conteudos/teste",
    "/conteudos/teste/",
    "/admin",
    "/conta",
    "/painel-bikes",
    "/newsletter/confirmar",
  ])("evita anúncio geral duplicado ou privado em %s", (path) => {
    state.path = path;
    expect(renderToStaticMarkup(<SiteFooter />)).not.toContain("/ads/wosi/");
  });
  it("posiciona a arte 3 no fim do artigo mobile e após os destaques no desktop", () => {
    const html = renderToStaticMarkup(
      <ArticleView
        article={article}
        bikes={[]}
        sidebarArticles={[
          { id: "other", slug: "other", title: "Artigo em destaque de teste" },
        ]}
      />,
    );
    expect(html).not.toContain("site-desktop.gif");
    expect(html.match(/src="\/ads\/wosi\/article.png"/g)).toHaveLength(2);
    expect(html.indexOf("Último parágrafo")).toBeLessThan(
      html.indexOf("Publicidade Wosi"),
    );
    expect(html.indexOf('class="min-w-0 mt-10 lg:hidden"')).toBeLessThan(
      html.indexOf("</article>"),
    );
    expect(html.indexOf("Artigo em destaque de teste")).toBeLessThan(
      html.indexOf('class="min-w-0 hidden lg:block"'),
    );
    expect(
      renderToStaticMarkup(
        <ArticleView article={article} bikes={[]} preview />,
      ),
    ).not.toContain("/ads/wosi/");
  });
});
