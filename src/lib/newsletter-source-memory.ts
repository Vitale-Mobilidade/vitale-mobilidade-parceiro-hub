import type { NewsletterContent } from "./newsletter";
import type { NewsletterCandidate } from "./newsletter-curation";
import { curateNewsletter } from "./newsletter-curation";
export function newsletterVideoId(url: string) {
  const u = new URL(url);
  return (
    u.searchParams.get("v") ??
    (u.hostname === "youtu.be" ? u.pathname.slice(1) : undefined)
  );
}
export async function newsletterUsedSources<T extends { videoId: string }>(
  history: NewsletterContent[],
  read: (slug: string) => Promise<T | null>,
) {
  const ids = new Set(
    history.flatMap((p) => [
      ...(p.sourceVideoIds ?? []),
      ...p.videos.flatMap((v) => newsletterVideoId(v.url) ?? []),
    ]),
  );
  const recent = [
    ...new Map(history.map((p) => [p.editionNumber ?? p.subject, p])).values(),
  ].slice(0, 6);
  for (const p of recent.filter((p) => !p.sourceVideoIds)) {
    const articles = await Promise.all(
      p.articles.map((a) => read(new URL(a.url).pathname.split("/").pop()!)),
    );
    if (articles.some((a) => !a))
      throw new Error("newsletter_sources_unavailable");
    articles.forEach((a) => {
      if (a?.videoId) ids.add(a.videoId);
    });
  }
  return ids;
}
/** Replan the selection before any paid writing; never choose a replacement by hand. */
export async function curateNewsletterSources<
  A extends NewsletterCandidate & { slug: string },
  V extends NewsletterCandidate & { videoId: string },
  T extends { videoId: string },
>(
  articles: A[],
  videos: V[],
  read: (slug: string) => Promise<T | null>,
  used: Set<string>,
  since: Date,
  now: Date,
  excludedTitles: string[],
  recentBikeIds: string[],
) {
  const cache = new Map<string, T>();
  let candidates = articles;
  for (let round = 0; round < 10; round++) {
    const curated = curateNewsletter(
      candidates,
      videos.filter((v) => !used.has(v.videoId)),
      since,
      now,
      excludedTitles,
      recentBikeIds,
    );
    const full = await Promise.all(
      curated.articles.map(async (a) => {
        if (!cache.has(a.slug)) {
          const source = await read(a.slug);
          if (!source) throw new Error("newsletter_sources_unavailable");
          cache.set(a.slug, source);
        }
        return cache.get(a.slug)!;
      }),
    );
    const sourceIds = new Set(full.map((a) => a.videoId));
    const repeated = curated.articles.filter((a, i) =>
      used.has(full[i].videoId),
    );
    const overlaps = curated.videos.filter((v) => sourceIds.has(v.videoId));
    if (!repeated.length && !overlaps.length && sourceIds.size === full.length)
      return { ...curated, fullArticles: full };
    const repeatedSlugs = new Set(repeated.map((a) => a.slug));
    // Annotate loaded candidates so the next pass deduplicates sources across media.
    candidates = candidates
      .filter((a) => !repeatedSlugs.has(a.slug))
      .map((a) =>
        cache.has(a.slug) ? { ...a, videoId: cache.get(a.slug)!.videoId } : a,
      );
  }
  throw new Error("newsletter_sources_insufficient_diversity");
}
