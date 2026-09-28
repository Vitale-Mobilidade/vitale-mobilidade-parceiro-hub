import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { ArticleView, type PublishedArticle } from "../components/editorial/ArticleView";
import type { CatalogBike } from "./editorial-bikes";
vi.mock("@tanstack/react-router", () => ({ Link: ({ children }: { children: React.ReactNode }) => <a>{children}</a> }));

it.each(["v8_pro", "ft03", "bw1", "l20_cross"])(
  "SSR da lateral usa imagem persistida de %s sem depender do navegador",
  (id) => {
    const bike: CatalogBike = {
      bikeId: id,
      name: id,
      slug: id,
      image: "https://vitalemobilidade.com/assets/old.jpg",
      link: null,
      sheetPrice: null,
      autonomy: null,
      capacity: null,
      description: null,
      category: null,
    };
    const article = {
      id: "article",
      title: "Mobilidade urbana",
      summary: "Introdução",
      blocks: [],
      faq: [],
      relatedBikeIds: [],
      relatedArticleIds: [],
      primaryBikeId: id,
      videoId: "abcDEFG1234",
      ogImageUrl: null,
    } as unknown as PublishedArticle;
    const html = renderToStaticMarkup(<ArticleView article={article} bikes={[bike]} />);
    expect(html).toContain(`src="https://test.invalid/functions/v1/bike-image?id=${id}"`);
    expect(html).not.toContain('src="https://vitalemobilidade.com/assets/old.jpg"');
  },
);
