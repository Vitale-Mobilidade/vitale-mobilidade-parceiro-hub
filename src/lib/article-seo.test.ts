import { describe, expect, it } from "vitest";
import type { PublishedArticle } from "@/components/editorial/ArticleView";
import { articleSchemas, articleSourceUrl } from "./article-seo";
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
  it("rejects future upload dates without losing the article or its source", () => {
    const now = new Date("2026-10-13T23:00:00Z");
    const schemas = articleSchemas(
      article,
      { ...video, date: "2026-11-13" },
      now,
    );
    expect(schemas.map((schema) => schema["@type"])).toEqual([
      "Article",
      "BreadcrumbList",
    ]);
    expect(schemas[0]).toHaveProperty("isBasedOn", video.url);
    expect(schemas[0]).not.toHaveProperty("video");
    const valid = articleSchemas(
      article,
      { ...video, date: "2026-10-13" },
      now,
    );
    expect(valid[0].video).toEqual({
      "@id": "https://vitalemobilidade.com/conteudos/teste#video",
    });
    expect(
      valid.find((schema) => schema["@type"] === "VideoObject")?.uploadDate,
    ).toBe("2026-10-13");
  });
  it("builds canonical source URLs and rejects invalid IDs without trusting catalog URLs", () => {
    expect(articleSourceUrl(article.videoId)).toBe(video.url);
    expect(articleSourceUrl('abcdefghijk" onclick="alert(1)')).toBeNull();
    expect(articleSourceUrl("../evil")).toBeNull();
    const invalid = articleSchemas(
      { ...article, videoId: "../evil" },
      { ...video, videoId: "../evil" },
    );
    expect(invalid.some((schema) => schema["@type"] === "VideoObject")).toBe(
      false,
    );
    expect(JSON.stringify(invalid[0])).not.toContain("isBasedOn");
    expect(
      articleSchemas(article, { ...video, url: "https://example.com" })[1].url,
    ).toBe(video.url);
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
