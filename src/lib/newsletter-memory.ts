import {
  newsletterCandidateBikeIds,
  newsletterCandidateModels,
  type NewsletterBikeIdentity,
} from "./newsletter-models";
import type { NewsletterContent } from "./newsletter";
import type { NewsletterCandidate } from "./newsletter-curation";

export function newsletterMemory<
  A extends NewsletterCandidate & { slug: string },
  V extends NewsletterCandidate & { url: string },
>(
  history: NewsletterContent[],
  articles: A[],
  videos: V[],
  catalog: NewsletterBikeIdentity[] = [],
) {
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
    newsletterCandidateBikeIds(item, catalog).forEach((id) => ids.add(id));
    newsletterCandidateModels(item, catalog).forEach((id) => ids.add(id));
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
      add(a);
      if (source) add(source);
    }
    for (const v of p.videos) {
      const id = new URL(v.url).searchParams.get("v");
      const source = videos.find((x) =>
        id ? x.videoId === id : path(x.url) === path(v.url),
      );
      add(v);
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
      [
        p.subject,
        p.headline,
        p.intro,
        ...[...p.articles, p.bike, ...p.videos].map(
          (item) =>
            `${item.title}: ${(item.paragraphs ?? []).join(" ").slice(0, 250)}`,
        ),
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  };
}

/** Same rules apply to persisted scheduled drafts, including ones made before this release. */
export function validateNewsletterSelection<
  A extends NewsletterCandidate & { slug: string },
  V extends NewsletterCandidate & { url: string },
>(
  content: NewsletterContent,
  history: NewsletterContent[],
  articles: A[],
  videos: V[],
  catalog: NewsletterBikeIdentity[] = [],
) {
  void articles;
  void videos;
  void catalog;
  const selectedPaths = new Set<string>();
  const articlePaths = new Set(
    history.flatMap((p) => p.articles.map((a) => new URL(a.url).pathname)),
  );
  const videoKey = (url: string) =>
    new URL(url).searchParams.get("v") ?? new URL(url).pathname;
  const videoKeys = new Set(
    history.flatMap((p) => p.videos.map((v) => videoKey(v.url))),
  );
  for (const item of [...content.articles, content.bike, ...content.videos]) {
    const pathname = new URL(item.url).pathname;
    if (
      articlePaths.has(pathname) ||
      (content.videos.includes(item) && videoKeys.has(videoKey(item.url)))
    )
      throw new Error("newsletter_content_already_used");
    const key = content.videos.includes(item)
      ? `video:${videoKey(item.url)}`
      : pathname;
    if (selectedPaths.has(key))
      throw new Error("newsletter_content_already_used");
    selectedPaths.add(key);
  }
  // Bikes may recur in genuinely new articles. Source identity remains the
  // hard gate; model/category rotation is a ranking preference in curation.
}
