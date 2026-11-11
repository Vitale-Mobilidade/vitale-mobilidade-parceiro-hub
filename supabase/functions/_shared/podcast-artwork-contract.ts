import { isCoverUuid } from "./editorial-cover.ts";

export const PODCAST_ARTWORK_EDGE = "https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image";
export const podcastArticleSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

