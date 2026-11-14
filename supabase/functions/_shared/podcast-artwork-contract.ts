import { isCoverUuid } from "./editorial-cover.ts";

export const PODCAST_ARTWORK_EDGE = "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image";
export const podcastArticleSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function preparedPodcastCoverPath(articleId: string, version: string) {
  return isCoverUuid(articleId) && /^\d{1,14}$/.test(version)
    ? `${articleId}/podcast-covers/v3-${version}.jpg` : null;
}

export function podcastArticleCoverSource(value: string | null): URL | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.username || url.password || url.hash) return null;
    if (url.origin + url.pathname === PODCAST_ARTWORK_EDGE
      && url.searchParams.get("type") === "editorial-cover"
      && isCoverUuid(url.searchParams.get("id"))
      && isCoverUuid(url.searchParams.get("file"))) return url;
    if (url.origin === "https://i.ytimg.com"
      && /^\/vi\/[A-Za-z0-9_-]{11}\/[A-Za-z0-9_-]+\.jpg$/.test(url.pathname)) return url;
  } catch { /* Ignore malformed article artwork URLs. */ }
  return null;
}


export function podcastCoverPath(article: { slug: string | null; og_image_url: string | null; updated_at: string }, download = false) {
  if (!article.slug || article.slug.length > 120 || !podcastArticleSlug.test(article.slug)
    || !podcastArticleCoverSource(article.og_image_url)) return null;
  const version = Date.parse(article.updated_at);
  const path = `/podcast/capas/${article.slug}.v3.jpg`;
  const params = new URLSearchParams({ layout: "3" });
  if (Number.isFinite(version)) params.set("v", String(version));
  if (download) params.set("download", "1");
  return params.size ? `${path}?${params}` : path;
}

export function preparedPodcastInstagramPath(articleId: string, version: string) {
  return isCoverUuid(articleId) && /^\d{1,14}$/.test(version)
    ? `${articleId}/podcast-instagram/v4-${version}.jpg` : null;
}
