import type { PublishedArticle } from "@/components/editorial/ArticleView";
import type { VideoCard } from "@/lib/videos.functions";
import { canonicalUrl, SITE_NAME, SITE_URL } from "@/lib/seo";

export const EDITORIAL_AUTHOR = {
  "@type": "Organization",
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  "@id": `${SITE_URL}/#organization`,
};

/** Article authorship is the editorial organization; no personal byline is inferred from a video. */
export function articleSchemas(
  article: PublishedArticle,
  video?: VideoCard | null,
) {
  const url = canonicalUrl(`/conteudos/${article.slug}`);
  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${url}#article`,
      headline: article.title,
      description: article.metaDescription || article.summary,
      datePublished: article.publishedAt || undefined,
      image: article.ogImageUrl || undefined,
      inLanguage: "pt-BR",
      mainEntityOfPage: url,
      author: EDITORIAL_AUTHOR,
      publisher: EDITORIAL_AUTHOR,
      isBasedOn: `https://www.youtube.com/watch?v=${article.videoId}`,
    },
  ];
  // Google requires uploadDate. A missing source date never becomes the article's publication date.
  const date = video?.date;
  if (
    video?.videoId === article.videoId &&
    date &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(`${date}T00:00:00Z`)) &&
    new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date
  ) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `${url}#video`,
      name: video.title,
      description: article.metaDescription || article.summary,
      thumbnailUrl: video.thumbnail,
      uploadDate: date,
      embedUrl: `https://www.youtube-nocookie.com/embed/${article.videoId}`,
      url: video.url,
      inLanguage: "pt-BR",
    });
  }
  schemas.push({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Início",
        item: canonicalUrl("/"),
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Conteúdos",
        item: canonicalUrl("/conteudos"),
      },
      { "@type": "ListItem", position: 3, name: article.title, item: url },
    ],
  });
  return schemas;
}
