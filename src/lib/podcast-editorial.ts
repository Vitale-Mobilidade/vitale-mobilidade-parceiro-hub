import { isCoverUuid } from "../../supabase/functions/_shared/editorial-cover";

export type PodcastArticle = {
  slug: string;
  title: string;
  summary: string;
  og_image_url: string | null;
  updated_at: string;
};

export const PODCAST_SITE = "https://vitalemobilidade.com";
export const podcastArticleSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function podcastArticleCoverSource(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return null;
    if (url.origin === "https://ipectfejftfcikvozoyu.supabase.co"
      && url.pathname === "/functions/v1/bike-image"
      && url.searchParams.get("type") === "editorial-cover"
      && isCoverUuid(url.searchParams.get("id"))
      && isCoverUuid(url.searchParams.get("file"))) return url;
    if (url.origin === "https://i.ytimg.com"
      && /^\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_-]+\.jpg$/.test(url.pathname)) return url;
  } catch { /* Ignore malformed article artwork URLs. */ }
  return null;
}

export function podcastCoverPath(article: { slug: string | null; og_image_url: string | null; updated_at: string }) {
  if (!article.slug || article.slug.length > 120 || !podcastArticleSlug.test(article.slug)
    || !podcastArticleCoverSource(article.og_image_url)) return null;
  const version = Date.parse(article.updated_at);
  const path = `/podcast/capas/${article.slug}.jpg`;
  return Number.isFinite(version) ? `${path}?v=${version}` : path;
}
