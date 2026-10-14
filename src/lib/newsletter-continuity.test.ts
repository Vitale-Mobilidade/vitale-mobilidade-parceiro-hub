import { expect, it } from "vitest";
import current from "../../artifacts/newsletter-rotation-current.json";
import catalog from "../../artifacts/newsletter-rotation-catalog.json";
import sourceMap from "../../artifacts/newsletter-rotation-sources.json";
import {
  newsletterMemory,
  validateNewsletterSelection,
} from "./newsletter-memory";
import {
  curateNewsletterSources,
  newsletterUsedSources,
} from "./newsletter-source-memory";
import {
  curateNewsletter,
  selectFeaturedNewsletterBike,
} from "./newsletter-curation";
import { newsletterCandidateBikeIds } from "./newsletter-models";
import type { NewsletterContent } from "./newsletter";

it("prepares twenty successive editions from the real catalog with no reused article or underlying video", async () => {
  const history = current.history as NewsletterContent[];
  const identities = catalog.bikes;
  const read = async (slug: string) =>
    sourceMap.find((x) => x.slug === slug) ?? null;
  const used = await newsletterUsedSources(history, read);
  const allPaths = new Set(
    history.flatMap((p) => p.articles.map((a) => a.url)),
  );
  const featured: string[] = [];
  for (let n = 3; n <= 22; n++) {
    const memory = newsletterMemory(
      history,
      current.articles,
      catalog.videos,
      identities,
    );
    const selection = await curateNewsletterSources(
      memory.articles
        .filter((a) => !a.newsletterUsed)
        .map((a) => ({
          ...a,
          bikeIds: newsletterCandidateBikeIds(a, identities),
        })),
      catalog.videos.map((v) => ({
        ...v,
        bikeIds: newsletterCandidateBikeIds(v, identities),
      })),
      read,
      used,
      new Date("2026-10-12"),
      new Date("2026-10-14T20:00:00Z"),
      history.flatMap((p) => [...p.articles, ...p.videos].map((x) => x.title)),
      memory.recentBikeIds,
    );
    expect(selection.articles, `edition ${n} articles`).toHaveLength(3);
    expect(selection.videos, `edition ${n} videos`).toHaveLength(2);
    const ids = [
      ...selection.fullArticles.map((a) => a.videoId),
      ...selection.videos.map((v) => v.videoId),
    ];
    expect(new Set(ids).size).toBe(5);
    ids.forEach((id) => {
      expect(used.has(id), `source ${id}`).toBe(false);
      used.add(id);
    });
    const related = [...selection.articles, ...selection.videos].flatMap((x) =>
      newsletterCandidateBikeIds(x, identities),
    );
    const bike = selectFeaturedNewsletterBike(
      identities.map((b) => ({ id: b.bikeId, title: b.name })),
      [],
      related,
      memory.recentBikeIds,
    )!;
    featured.push(bike.id);
    const content: NewsletterContent = {
      editionNumber: n,
      subject: `Edition ${n}`,
      intro: `Intro ${n}`,
      sourceVideoIds: ids,
      bike: {
        title: bike.title,
        url: `https://vitalemobilidade.com/radar/${bike.id}`,
      },
      articles: selection.articles.map((a) => ({
        title: a.title,
        url: `https://vitalemobilidade.com/conteudos/${a.slug}`,
      })),
      videos: selection.videos.map((v) => ({ title: v.title, url: v.url })),
    };
    content.articles.forEach((a) => {
      expect(allPaths.has(a.url)).toBe(false);
      allPaths.add(a.url);
    });
    expect(() =>
      validateNewsletterSelection(
        content,
        history,
        current.articles,
        catalog.videos,
        identities,
      ),
    ).not.toThrow();
    history.unshift(content);
  }
  expect(new Set(featured).size).toBeGreaterThan(5);
});

it("does not exhaust two bike models when there are twenty distinct article topics", () => {
  const articles = Array.from({ length: 20 }, (_, i) => ({
    slug: `topic-${i}`,
    title: `Pauta inédita ${i}`,
    primaryBikeId: i % 2 ? "v8_pro" : "v9_max",
    contentType: "education",
    publishedAt: "2026-10-10",
  }));
  const seen = new Set<string>();
  for (let n = 0; n < 6; n++) {
    const picked = curateNewsletter(
      articles.filter((a) => !seen.has(a.slug)),
      [],
      new Date("2026-10-01"),
      new Date("2026-10-14"),
      [],
      ["v8_pro", "v9_max"],
    );
    expect(picked.articles).toHaveLength(3);
    picked.articles.forEach((a) => {
      expect(seen.has(a.slug)).toBe(false);
      seen.add(a.slug);
    });
  }
  expect(seen.size).toBe(18);
});
