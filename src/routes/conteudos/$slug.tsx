import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { ArticleView } from "@/components/editorial/ArticleView";
import { getPublishedArticle } from "@/lib/editorial.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { safeVideos } from "@/lib/videos.functions";
import { canonicalUrl, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/conteudos/$slug")({
  loader: async ({ params }) => {
    const article = await getPublishedArticle({ data: params.slug });
    if (!article) throw notFound();
    const [catalog, index, videos] = await Promise.all([getBikeCatalog(), getPublishedArticles(),
      article.primaryBikeId ? safeVideos({ bikeId: article.primaryBikeId, limit: 12 }) : Promise.resolve([])]);
    return { article, bikes: catalog.ok ? catalog.bikes : [],
      relatedArticles: (index ?? []).filter(a => article.relatedArticleIds.includes(a.id)),
      relatedVideos: videos.filter(video => video.videoId !== article.videoId) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Conteúdo indisponível | Vitale" }, { name: "robots", content: "noindex" }] };
    const a = loaderData.article;
    const head = pageHead({ path: `/conteudos/${a.slug}`, title: a.seoTitle || a.title,
      description: a.metaDescription || a.summary, ogTitle: a.ogTitle || a.title,
      ogDescription: a.ogDescription || a.summary, ogType: "article",
      robots: a.indexable ? "index, follow" : "noindex, follow" });
    if (a.ogImageUrl) {
      head.meta.push({ property: "og:image", content: a.ogImageUrl }, { name: "twitter:image", content: a.ogImageUrl });
      const variant = a.ogImageUrl.match(/\/(maxresdefault|sddefault|hqdefault|mqdefault)\.jpg(?:\?|$)/)?.[1];
      const dimensions: Record<string, [string, string]> = { maxresdefault: ["1280", "720"], sddefault: ["640", "480"], hqdefault: ["480", "360"], mqdefault: ["320", "180"] };
      if (variant && dimensions[variant]) head.meta.push(
        { property: "og:image:width", content: dimensions[variant][0] },
        { property: "og:image:height", content: dimensions[variant][1] },
      );
    }
    const schema = { "@context": "https://schema.org", "@type": "Article", headline: a.title,
      description: a.metaDescription || a.summary, datePublished: a.publishedAt,
      image: a.ogImageUrl || undefined, inLanguage: "pt-BR", mainEntityOfPage: canonicalUrl(`/conteudos/${a.slug}`),
      publisher: { "@id": "https://vitalemobilidade.com/#organization" },
      isBasedOn: `https://www.youtube.com/watch?v=${a.videoId}` };
    const videoSchema = { "@context": "https://schema.org", "@type": "VideoObject", name: a.title,
      description: a.metaDescription || a.summary, thumbnailUrl: a.ogImageUrl || undefined,
      embedUrl: `https://www.youtube-nocookie.com/embed/${a.videoId}`,
      contentUrl: `https://www.youtube.com/watch?v=${a.videoId}` };
    const breadcrumbs = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: canonicalUrl("/") },
      { "@type": "ListItem", position: 2, name: "Conteúdos", item: canonicalUrl("/conteudos") },
      { "@type": "ListItem", position: 3, name: a.title, item: canonicalUrl(`/conteudos/${a.slug}`) },
    ] };
    return { ...head, scripts: [{ type: "application/ld+json", children: JSON.stringify([schema, videoSchema, breadcrumbs]) }] };
  },
  component: ContentDetail,
});

function ContentDetail() {
  const { article, bikes, relatedArticles, relatedVideos } = Route.useLoaderData();
  return <div className="min-h-screen bg-background"><SiteHeader />
    <ArticleView article={article} bikes={bikes} relatedArticles={relatedArticles} relatedVideos={relatedVideos} /><SiteFooter /></div>;
}
