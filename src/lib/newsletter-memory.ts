import type { NewsletterContent } from "./newsletter";
import type { NewsletterCandidate } from "./newsletter-curation";

export function newsletterMemory<
  A extends NewsletterCandidate & { slug: string },
  V extends NewsletterCandidate & { url: string },
>(history: NewsletterContent[], articles: A[], videos: V[]) {
  const path = (url: string) => new URL(url).pathname;
  const usedArticles = new Set(
    history.flatMap((p) => p.articles.map((a) => path(a.url))),
  );
  // Campaigns for different interests can carry the same edition.
  const recent = [
    ...new Map(history.map((p) => [p.editionNumber ?? p.subject, p])).values(),
  ].slice(0, 6);
  const ids = new Set<string>();
  const add = (item: NewsletterCandidate) => {
    [
      item.primaryBikeId,
      ...(item.relatedBikeIds ?? []),
      ...(item.bikeIds ?? []),
    ].forEach((id) => {
      if (id) ids.add(id);
    });
  };
  for (const p of recent) {
    p.mentionedBikeIds?.forEach((id) => ids.add(id));
    for (const item of [p.bike, ...(p.drops ?? [])]) {
      const id = path(item.url).split("/").pop();
      if (id) ids.add(id);
    }
    for (const a of p.articles) {
      const source = articles.find(
        (x) => `/conteudos/${x.slug}` === path(a.url),
      );
      if (source) add(source);
    }
    for (const v of p.videos) {
      const id = new URL(v.url).searchParams.get("v");
      const source = videos.find((x) =>
        id ? x.videoId === id : path(x.url) === path(v.url),
      );
      if (source) add(source);
    }
  }
  return {
    articles: articles.map((a) => ({
      ...a,
      newsletterUsed: usedArticles.has(`/conteudos/${a.slug}`),
    })),
    recentBikeIds: [...ids],
    previousEditorial: recent.map((p) =>
      [p.subject, p.headline, p.intro].filter(Boolean).join("\n"),
    ),
  };
}
