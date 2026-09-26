import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { ArticleView } from "@/components/editorial/ArticleView";
import { getPublishedArticle } from "@/lib/editorial.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { safeVideos } from "@/lib/videos.functions";
import { getRadarCatalog } from "@/lib/radar.functions";
import { canonicalUrl, pageHead, serializeJsonLd } from "@/lib/seo";
import { orderEditorialHighlights, relatedPublishedArticles } from "@/lib/editorial-discovery";

export const Route = createFileRoute("/conteudos/$slug")({
  loader: async ({ params }) => {
    const article = await getPublishedArticle({ data: params.slug });
    if (!article) throw notFound();
    const [catalog, index, radar, videos] = await Promise.all([getBikeCatalog(), getPublishedArticles(),
      article.primaryBikeId || article.relatedBikeIds.length ? getRadarCatalog() : Promise.resolve({ ok: false as const }),
      article.primaryBikeId ? safeVideos({ bikeId: article.primaryBikeId, limit: 12 }) : Promise.resolve([])]);
    const contextualArticles = relatedPublishedArticles(article, index ?? []);
    const connectedIds = new Set([article.primaryBikeId, ...article.relatedBikeIds].filter(Boolean));
    const offers = (radar.ok ? radar.bikes : []).flatMap(item => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const bike = item as Record<string, unknown>;
      const id = typeof bike.id === "string" ? bike.id : typeof bike.bikeId === "string" ? bike.bikeId : null;
      return id && connectedIds.has(id) && bike.hasCurrentOffer === true && typeof bike.currentPrice === "number" && Number.isFinite(bike.currentPrice) && bike.currentPrice > 0
        ? [{ id, price: bike.currentPrice, daily: Array.isArray(bike.daily) ? bike.daily : [] }] : [];
    });
    const prices = Object.fromEntries(offers.map(offer => [offer.id, offer.price]));
    const histories = Object.fromEntries(offers.map(offer => [offer.id, offer.daily.flatMap(point => {
      if (!point || typeof point !== "object" || Array.isArray(point)) return [];
      const row = point as Record<string, unknown>;
      return typeof row.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(row.date) &&
        typeof row.close === "number" && Number.isFinite(row.close) && row.close > 0
        ? [{ date: row.date, close: row.close }] : [];
    }).slice(-30)]));
    return { article, bikes: catalog.ok ? catalog.bikes : [],
      relatedArticles: orderEditorialHighlights(contextualArticles.length ? contextualArticles : (index ?? []).filter(a => a.id !== article.id)).slice(0, 4),
      sidebarArticles: orderEditorialHighlights((index ?? []).filter(a => a.id !== article.id)).slice(0, 8),
      prices, histories,
      articlesShareContext: contextualArticles.length > 0,
      relatedVideos: videos.filter(video => video.videoId !== article.videoId) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Conteúdo indisponível | Vitale" }, { name: "robots", content: "noindex" }] };
    const a = loaderData.article;
    const variant = a.ogImageUrl?.match(/\/(maxresdefault|sddefault|hqdefault|mqdefault)\.jpg(?:\?|$)/)?.[1];
    const dimensions: Record<string, [number, number]> = { maxresdefault: [1280, 720], sddefault: [640, 480], hqdefault: [480, 360], mqdefault: [320, 180] };
    const imageDimensions = variant ? dimensions[variant] : undefined;
    const head = pageHead({ path: `/conteudos/${a.slug}`, title: a.seoTitle || a.title,
      description: a.metaDescription || a.summary, ogTitle: a.ogTitle || a.title,
      ogDescription: a.ogDescription || a.summary, ogType: "article",
      robots: a.indexable ? "index, follow" : "noindex, follow",
      image: a.ogImageUrl ? { url: a.ogImageUrl, width: imageDimensions?.[0], height: imageDimensions?.[1],
        type: /\.jpe?g(?:\?|$)/i.test(a.ogImageUrl) ? "image/jpeg" : undefined, alt: a.ogTitle || a.title } : undefined });
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
    return { ...head, scripts: [{ type: "application/ld+json", children: serializeJsonLd([schema, videoSchema, breadcrumbs]) }] };
  },
  component: ContentDetail,
});

function ContentDetail() {
  const { article, bikes, relatedArticles, sidebarArticles, articlesShareContext, relatedVideos, prices, histories } = Route.useLoaderData();
  return <div className="min-h-screen bg-background"><SiteHeader />
    <main><ArticleView article={article} bikes={bikes} prices={prices} histories={histories} relatedArticles={relatedArticles} sidebarArticles={sidebarArticles} articlesShareContext={articlesShareContext} relatedVideos={relatedVideos} /></main><SiteFooter /></div>;
}
