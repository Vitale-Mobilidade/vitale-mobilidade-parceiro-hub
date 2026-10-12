import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ArticleView, type PublishedArticle } from "../components/editorial/ArticleView";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

it("renderiza artigo independente sem aviso fixo, preservando vídeo complementar", () => {
  const article = { id:"article", title:"V9 Max para duas pessoas", summary:"Banco alongado e bateria removível.", blocks:[{type:"text", heading:"Bateria",text:"A bateria tem 48 V e 15,6 Ah."},{type:"video", heading:"Veja a V9 Max",videoId:"abcDEFG1234"}], faq:[], relatedBikeIds:[],relatedArticleIds:[],primaryBikeId:null,videoId:"abcDEFG1234",ogImageUrl:null } as unknown as PublishedArticle;
  const html = renderToStaticMarkup(<ArticleView article={article} bikes={[]} />);
  expect(html).toContain("Banco alongado e bateria removível.");
  expect(html).toContain("https://www.youtube-nocookie.com/embed/abcDEFG1234");
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('title="Veja a V9 Max"');
  expect(html).toContain("allowFullScreen");
  expect(html).not.toContain("autoplay=1");
  expect(html).not.toContain("Reproduzir:");
  expect(html).not.toContain("bg-ink/35");
  expect(html).not.toMatch(/Baseado no|vídeo de origem|Os relatos se referem|não garantem o mesmo resultado/);
});
