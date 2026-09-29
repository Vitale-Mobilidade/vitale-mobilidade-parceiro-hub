import { describe, expect, it } from "vitest";
import type { PublishedArticle } from "@/components/editorial/ArticleView";
import { articleSchemas } from "./article-seo";
import { editorialFormat } from "./editorial-taxonomy";

const article = {
  slug: "teste",
  title: "Teste",
  summary: "Resumo",
  metaDescription: "Descrição",
  publishedAt: "2026-09-29T10:00:00Z",
  videoId: "abcdefghijk",
  ogImageUrl: "https://example.com/photo.jpg",
} as PublishedArticle;
const video = {
  videoId: article.videoId,
  title: "Vídeo original",
  date: "2025-02-21",
  url: `https://www.youtube.com/watch?v=${article.videoId}`,
  thumbnail: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
};

describe("article source and authorship", () => {
  it("attributes the editorial organization without inventing a personal author", () => {
    expect(articleSchemas(article)[0]).toMatchObject({
      author: { "@type": "Organization", name: "Vitale Mobilidade" },
      datePublished: article.publishedAt,
    });
    expect(articleSchemas(article)[0]).not.toHaveProperty("dateModified");
  });
  it("uses actual source metadata for a dated video and never treats a watch page as a video file", () => {
    const schema = articleSchemas(article, video).find(
      (s) => s["@type"] === "VideoObject",
    );
    expect(schema).toMatchObject({
      uploadDate: "2025-02-21",
      name: "Vídeo original",
      url: video.url,
    });
    expect(schema).not.toHaveProperty("contentUrl");
  });
  it("omits incomplete video schema for missing, impossible or mismatched source dates", () => {
    for (const source of [
      null,
      { ...video, date: null },
      { ...video, date: "2025-02-31" },
      { ...video, videoId: "other-video" },
    ]) {
      expect(
        articleSchemas(article, source).some(
          (s) => s["@type"] === "VideoObject",
        ),
      ).toBe(false);
    }
  });
  it("uses the CMS classification even when a title does not contain a category keyword", () => {
    expect(editorialFormat("comparison").label).toBe("Comparativos");
    expect(editorialFormat("guide").label).toBe("Guias de escolha");
    expect(editorialFormat(undefined).value).toBe("other");
  });
});
