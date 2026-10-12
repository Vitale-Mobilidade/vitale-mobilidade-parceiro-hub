import { expect, it, vi } from "vitest";
import {
  newsletterUsedSources,
  curateNewsletterSources,
} from "./newsletter-source-memory";
import type { NewsletterContent } from "./newsletter";
const article = (slug: string, type: string) => ({
  slug,
  title: slug,
  contentType: type,
  publishedAt: "2026-10-10",
});
const date = new Date("2026-10-12");
it("excludes an article from the video already used by an earlier edition and replans automatically", async () => {
  const articles = [
    article("tools", "education"),
    article("fresh", "education"),
    article("review", "product_review"),
    article("comparison", "comparison"),
  ];
  const read = vi.fn(async (slug: string) => ({
    videoId: slug === "tools" ? "used-site-video" : slug,
  }));
  const result = await curateNewsletterSources(
    articles,
    [
      {
        title: "Practical new",
        videoId: "ride",
        date: "2026-10-10",
        contentType: "real_world_test",
      },
    ],
    read,
    new Set(["used-site-video"]),
    date,
    date,
    [],
    [],
  );
  expect(result.articles.map((a) => a.slug)).toEqual([
    "fresh",
    "review",
    "comparison",
  ]);
  expect(read.mock.calls.filter(([slug]) => slug === "review")).toHaveLength(1);
});
it("deduplicates underlying sources across different article URLs and videos", async () => {
  const read = async (slug: string) => ({
    videoId: slug === "one" || slug === "two" ? "same" : slug,
  });
  const result = await curateNewsletterSources(
    [
      article("one", "education"),
      article("two", "product_review"),
      article("other", "product_review"),
    ],
    [
      {
        title: "Different video title",
        videoId: "same",
        date: "2026-10-10",
        contentType: "comparison",
      },
      {
        title: "New ride",
        videoId: "new",
        date: "2026-10-10",
        contentType: "real_world_test",
      },
    ],
    read,
    new Set(),
    date,
    date,
    [],
    [],
  );
  expect(result.articles.map((a) => a.slug)).toEqual(["one", "other"]);
  expect(result.videos.map((v) => v.videoId)).toEqual(["new"]);
});
it("resolves old article sources and uses persisted snapshots for later editions", async () => {
  const p: NewsletterContent = {
    subject: "Edition",
    intro: "Intro",
    bike: { title: "Bike", url: "https://vitalemobilidade.com/radar/bike" },
    articles: [
      {
        title: "Article",
        url: "https://vitalemobilidade.com/conteudos/article?utm_source=mail",
      },
    ],
    videos: [{ title: "Video", url: "https://youtu.be/video" }],
  };
  const read = vi.fn(async () => ({ videoId: "article-video" }));
  expect([...(await newsletterUsedSources([p], read))].sort()).toEqual([
    "article-video",
    "video",
  ]);
  read.mockClear();
  p.sourceVideoIds = ["article-video"];
  await newsletterUsedSources([p], read);
  expect(read).not.toHaveBeenCalled();
});
it("fails closed when an old source cannot be resolved", async () => {
  const p: NewsletterContent = {
    subject: "Edition",
    intro: "Intro",
    bike: { title: "Bike", url: "https://vitalemobilidade.com/radar/bike" },
    articles: [
      {
        title: "Article",
        url: "https://vitalemobilidade.com/conteudos/article",
      },
    ],
    videos: [],
  };
  await expect(newsletterUsedSources([p], async () => null)).rejects.toThrow(
    "newsletter_sources_unavailable",
  );
});
