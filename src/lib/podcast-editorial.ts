import { podcastArticleSlug } from "../../supabase/functions/_shared/podcast-artwork-contract";
export { podcastArticleCoverSource, podcastArticleSlug, podcastCoverPath } from "../../supabase/functions/_shared/podcast-artwork-contract";

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
