import { createFileRoute, notFound } from "@tanstack/react-router";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { ArticleView } from "@/components/editorial/ArticleView";
import { getPublishedArticle } from "@/lib/editorial.functions";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { canonicalUrl, pageHead } from "@/lib/seo";

export const Route = createFileRoute("/conteudos/$slug")({
  loader: async ({ params }) => {
    const article = await getPublishedArticle({ data: params.slug });
    if (!article) throw notFound();
    const [catalog, index] = await Promise.all([getBikeCatalog(), getPublishedArticles()]);
    return { article, bikes: catalog.ok ? catalog.bikes : [],
      relatedArticles: (index ?? []).filter(a => article.relatedArticleIds.includes(a.id)) };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Conteúdo indisponível | Vitale" }, { name: "robots", content: "noindex" }] };
    const a = loaderData.article;
    const head = pageHead({ path: `/conteudos/${a.slug}`, title: a.seoTitle || a.title,
      description: a.metaDescription || a.summary, ogTitle: a.ogTitle || a.title,
      ogDescription: a.ogDescription || a.summary, ogType: "article",
      robots: a.indexable ? "index, follow" : "noindex, follow" });
    if (a.ogImageUrl) head.meta.push({ property: "og:image", content: a.ogImageUrl }, { name: "twitter:image", content: a.ogImageUrl });
    const schema = { "@context": "https://schema.org", "@type": "Article", headline: a.title,
      description: a.metaDescription || a.summary, datePublished: a.publishedAt,
      image: a.ogImageUrl || undefined, inLanguage: "pt-BR", mainEntityOfPage: canonicalUrl(`/conteudos/${a.slug}`),
      publisher: { "@id": "https://vitalemobilidade.com/#organization" },
      isBasedOn: `https://www.youtube.com/watch?v=${a.videoId}` };
    return { ...head, scripts: [{ type: "application/ld+json", children: JSON.stringify(schema) }] };
  },
  component: ContentDetail,
});

function ContentDetail() {
  const { article, bikes, relatedArticles } = Route.useLoaderData();
  return <div className="min-h-screen bg-background"><SiteHeader />
    <ArticleView article={article} bikes={bikes} relatedArticles={relatedArticles} /><SiteFooter /></div>;
}
