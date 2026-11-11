import { podcastArticleCoverSource, podcastArticleSlug } from "../../supabase/functions/_shared/podcast-artwork-contract";
export { podcastArticleCoverSource, podcastArticleSlug };

export type PodcastArticle = {
  slug: string;
  title: string;
  summary: string;
  og_image_url: string | null;
  updated_at: string;
};

export const PODCAST_SITE = "https://vitalemobilidade.com";
export const PODCAST_ARTICLE_ANCHOR = "podcast";

export function podcastArticleEpisodeUrl(slug: string) {
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return null;
  return `${PODCAST_SITE}/conteudos/${slug}#${PODCAST_ARTICLE_ANCHOR}`;
}
export function podcastCoverPath(article: { slug: string | null; og_image_url: string | null; updated_at: string }, download = false) {
  if (!article.slug || article.slug.length > 120 || !podcastArticleSlug.test(article.slug)
    || !podcastArticleCoverSource(article.og_image_url)) return null;
  const version = Date.parse(article.updated_at);
  const path = `/podcast/capas/${article.slug}.jpg`;
  const params = new URLSearchParams({ layout: "2" });
  if (Number.isFinite(version)) params.set("v", String(version));
  if (download) params.set("download", "1");
  return params.size ? `${path}?${params}` : path;
}
