import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ArticleView, type PublishedArticle } from "../components/editorial/ArticleView";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

const article = { id:"article", title:"V9 Max para duas pessoas", summary:"Banco alongado e bateria removível.", blocks:[{type:"text", heading:"Bateria",text:"A bateria tem 48 V e 15,6 Ah."},{type:"video", heading:"Veja a V9 Max",videoId:"abcDEFG1234"}], faq:[], relatedBikeIds:[],relatedArticleIds:[],primaryBikeId:null,videoId:"abcDEFG1234",ogImageUrl:null } as unknown as PublishedArticle;

it("renderiza artigo independente sem aviso fixo, preservando vídeo complementar", () => {
  const html = renderToStaticMarkup(<ArticleView article={article} bikes={[]} />);
  expect(html).toContain("Banco alongado e bateria removível.");
  expect(html).not.toContain("Fonte em vídeo:");
  expect(html).not.toContain("Assista ao vídeo original da Vitale no YouTube");
  expect(html).toContain("https://www.youtube-nocookie.com/embed/abcDEFG1234");
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('title="Veja a V9 Max"');
  expect(html).toContain("allowFullScreen");
  expect(html).not.toContain("autoplay=1");
  expect(html).not.toContain("Reproduzir:");
  expect(html).not.toContain("bg-ink/35");
  expect(html).not.toMatch(/Baseado no|vídeo de origem|Os relatos se referem|não garantem o mesmo resultado/);
});

it("exibe o player na âncora compartilhável no corpo do artigo apenas com episódio no Spotify", () => {
  const episode = "324BQ31Y26a5askghi34ax";
  const rendered = renderToStaticMarkup(<ArticleView article={article} bikes={[]} spotifyEpisodeId={episode} />);
  expect(rendered).toContain('id="podcast"');
  expect(rendered).toContain(`https://open.spotify.com/embed/episode/${episode}`);
  expect(rendered).not.toContain("<audio");
  expect(rendered.indexOf("A bateria tem")).toBeLessThan(rendered.indexOf('id="podcast"'));
  expect(renderToStaticMarkup(<ArticleView article={article} bikes={[]} />)).not.toContain('id="podcast"');
  expect(renderToStaticMarkup(<ArticleView article={article} bikes={[]} spotifyEpisodeId={episode} preview />))
    .not.toContain('id="podcast"');
});

it("separa o Spotify e as chamadas no HTML de um artigo planejado", () => {
  const planned = { ...article, blocks: [
    { type: "text", planned: true, text: "Primeiro parágrafo editorial." },
    { type: "text", planned: true, text: "Segundo parágrafo editorial." },
    { type: "quiz", planned: true },
    { type: "video", planned: true, heading: "Vídeo complementar" },
    { type: "text", planned: true, text: "Terceiro parágrafo editorial." },
    { type: "text", planned: true, text: "Último parágrafo editorial." },
  ] } satisfies PublishedArticle;
  const html = renderToStaticMarkup(<ArticleView article={planned} bikes={[]} spotifyEpisodeId="324BQ31Y26a5askghi34ax" />);
  const widgets = [...html.matchAll(/id="podcast"|aria-label="Quiz de perfil"|<h2[^>]*>Vídeo complementar<\/h2>/g)];
  expect(widgets).toHaveLength(3);
  for (let i = 1; i < widgets.length; i++)
    expect(html.slice(widgets[i - 1].index, widgets[i].index)).toMatch(/<p[^>]*><span>[^<]*parágrafo editorial\.<\/span><\/p>/);
});
