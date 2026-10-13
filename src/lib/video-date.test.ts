import { expect, it } from "vitest";
import { normalizeVideoDate } from "./video-date";
import { articleSchemas } from "./article-seo";
import type { PublishedArticle } from "@/components/editorial/ArticleView";

it("clamps future dates to the Sao Paulo day and retains the source", () => {
  expect(
    normalizeVideoDate(
      { date: "2026-11-13" },
      new Date("2026-10-14T01:00:00Z"),
    ),
  ).toEqual({ date: "2026-10-13", sourceDate: "2026-11-13" });
  expect(
    normalizeVideoDate({ date: "2026-11-13" }, new Date("2026-10-14T03:00:00Z"))
      .date,
  ).toBe("2026-10-14");
});
it("preserves past dates and rejects impossible or missing dates", () => {
  const now = new Date("2026-10-13T22:00:00Z");
  expect(normalizeVideoDate({ date: "2024-02-29" }, now).date).toBe(
    "2024-02-29",
  );
  for (const date of ["2025-02-29", "2026-02-31", "13/10/2026", null]) {
    expect(normalizeVideoDate({ date }, now).date).toBeNull();
  }
});
it("never promotes the operational fallback to a factual upload date", () => {
  const now = new Date("2026-10-13T22:00:00Z");
  const video = normalizeVideoDate(
    {
      date: "2026-11-13",
      videoId: "abcdefghijk",
      title: "Fonte",
      url: "https://www.youtube.com/watch?v=abcdefghijk",
      thumbnail: "https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg",
    },
    now,
  );
  const article = {
    slug: "teste",
    title: "Teste",
    summary: "Resumo",
    videoId: video.videoId,
  } as PublishedArticle;
  expect(
    articleSchemas(article, video, now).some(
      (s) => s["@type"] === "VideoObject",
    ),
  ).toBe(false);
});
