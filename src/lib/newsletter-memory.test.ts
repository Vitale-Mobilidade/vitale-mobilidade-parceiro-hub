import { expect, it } from "vitest";
import { newsletterMemory } from "./newsletter-memory";
import type { NewsletterContent } from "./newsletter";
import { selectFeaturedNewsletterBike } from "./newsletter-curation";
const edition = (n: number): NewsletterContent => ({
  editionNumber: n,
  subject: `Edição ${n}`,
  intro: `Abertura ${n}`,
  bike: { title: "Bike", url: `https://vitalemobilidade.com/radar/b${n}` },
  articles: [
    { title: "Artigo", url: `https://vitalemobilidade.com/conteudos/a${n}` },
  ],
  videos: [{ title: "Vídeo", url: `https://youtube.com/watch?v=v${n}` }],
});
it("flags articles across all sent history and counts editions instead of cohorts", () => {
  const history = Array.from({ length: 7 }, (_, i) => edition(7 - i)).flatMap(
    (p) => [p, p, p],
  );
  const result = newsletterMemory(
    history,
    [
      { slug: "a1", title: "Artigo antigo" },
      { slug: "new", title: "Novo" },
    ],
    [],
  );
  expect(result.articles.map((a) => a.newsletterUsed)).toEqual([true, false]);
  expect(result.recentBikeIds).toContain("b2");
  expect(result.recentBikeIds).not.toContain("b1");
  expect(result.previousEditorial).toHaveLength(6);
});
it("remembers article, video, price cards and persisted bike mentions", () => {
  const p = edition(1);
  p.mentionedBikeIds = ["archived_bike"];
  p.drops = [
    { title: "Queda", url: "https://vitalemobilidade.com/radar/drop" },
  ];
  const result = newsletterMemory(
    [p],
    [
      {
        slug: "a1",
        title: "A",
        primaryBikeId: "article",
        relatedBikeIds: ["related"],
      },
    ],
    [
      {
        url: "https://youtube.com/watch?v=v1",
        videoId: "v1",
        title: "V",
        bikeIds: ["video"],
      },
    ],
  );
  expect(result.recentBikeIds.sort()).toEqual([
    "archived_bike",
    "article",
    "b1",
    "drop",
    "related",
    "video",
  ]);
});
it("prefers rotation but keeps a featured bike available in a finite catalog", () => {
  expect(
    selectFeaturedNewsletterBike([{ id: "a" }, { id: "b" }], [], ["b"], ["a"]),
  ).toEqual({ id: "a" });
});
