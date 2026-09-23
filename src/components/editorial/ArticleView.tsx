import type { CatalogBike } from "@/lib/editorial-bikes";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import type { ArticleBlock, ArticleFaq } from "../../../supabase/functions/_shared/editorial-contract";

export type PublishedArticle = {
  id: string; slug: string; title: string; summary: string; blocks: ArticleBlock[]; faq: ArticleFaq[];
  seoTitle: string; metaDescription: string; ogTitle: string; ogDescription: string;
  ogImageUrl: string | null; indexable: boolean; publishedAt: string | null;
  videoId: string; primaryBikeId: string | null; relatedBikeIds: string[]; relatedArticleIds: string[];
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function BikeDecision({ bikeId, bikes, mode }: { bikeId: string; bikes: CatalogBike[]; mode: "radar" | "specs" | "cta" }) {
  const bike = bikes.find(b => b.bikeId === bikeId);
  if (!bike) return null;
  return <section className="my-8 rounded-2xl border border-line bg-emerald-50 p-5 sm:p-7">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {bike.image && <img src={bike.image} alt={`Bike elétrica ${bike.name}`} loading="lazy" className="h-36 w-full rounded-xl bg-white object-contain sm:w-48" />}
      <div className="min-w-0 flex-1">
        <h2 className="text-xl font-bold">{bike.name}</h2>
        {mode === "specs" && <p className="mt-2 text-sm text-muted-foreground">
          {[bike.autonomy, bike.capacity].filter(Boolean).join(" · ") || "Especificações ainda não disponíveis."}
        </p>}
        {bike.sheetPrice != null && bike.link && <p className="mt-2 text-2xl font-bold text-emerald-800">{BRL.format(bike.sheetPrice)}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/bikes/${bike.slug}`} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900">Conhecer a bike</a>
          <a href={`/radar/${bike.bikeId}`} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900">Ver Radar de preços</a>
          {bike.link && bike.sheetPrice != null && <a href={bike.link} target="_blank" rel="sponsored noopener noreferrer"
            onClick={() => trackAffiliateClick({ bike_id: bike.bikeId, position: "content_article" })}
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Ver oferta no Mercado Livre</a>}
        </div>
        {!bike.link && <p className="mt-2 text-sm text-muted-foreground">Link indisponível no momento.</p>}
      </div>
    </div>
  </section>;
}

type RelatedArticle = { id: string; slug: string; title: string };
function FaqList({ faq }: { faq: ArticleFaq[] }) {
  if (!faq.length) return null;
  return <section className="my-10"><h2 className="mb-4 text-2xl font-bold">Perguntas frequentes</h2>
    <div className="divide-y divide-line">{faq.map((item, i) => <div key={i} className="py-4">
      <h3 className="font-semibold">{item.question}</h3><p className="mt-2 leading-7">{item.answer}</p>
    </div>)}</div></section>;
}

function Block({ block, article, bikes, relatedArticles }: { block: ArticleBlock; article: PublishedArticle; bikes: CatalogBike[]; relatedArticles: RelatedArticle[] }) {
  if (block.type === "hero") return block.text ? <p className="mb-6 text-lg font-medium">{block.text}</p> : null;
  if (block.type === "summary") return block.text ? <aside className="my-7 rounded-xl bg-surface p-5 text-lg">{block.text}</aside> : null;
  if (block.type === "text" || block.type === "pros_cons") return <section className="my-8">
    {block.heading && <h2 className="mb-3 text-2xl font-bold">{block.heading}</h2>}
    {block.text && <p className="whitespace-pre-line leading-8">{block.text}</p>}
  </section>;
  if (block.type === "video") return <section className="my-8">
    <h2 className="mb-3 text-2xl font-bold">{block.heading || "Teste em vídeo"}</h2>
    <div className="aspect-video overflow-hidden rounded-xl bg-emerald-950">
      <iframe src={`https://www.youtube-nocookie.com/embed/${article.videoId}`} title={block.heading || "Vídeo original da Vitale"}
        loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
    </div>
  </section>;
  if (["radar", "specs", "cta"].includes(block.type) && block.bikeId) {
    return <BikeDecision bikeId={block.bikeId} bikes={bikes} mode={block.type as "radar" | "specs" | "cta"} />;
  }
  if (block.type === "quiz") return <section className="my-8 rounded-2xl bg-emerald-950 p-6 text-white">
    <h2 className="text-2xl font-bold">Essa bike combina com você?</h2>
    <p className="mt-2 text-emerald-100">Descubra os modelos compatíveis com sua rotina, trajeto e orçamento.</p>
    <a href="/escolherbike" className="mt-4 inline-block rounded-lg bg-emerald-300 px-4 py-2 font-semibold text-emerald-950">Escolher minha bike</a>
  </section>;
  if (block.type === "comparator") return <section className="my-8 rounded-2xl bg-surface p-6">
    <h2 className="text-xl font-bold">Veja outros modelos</h2>
    <p className="mt-2 text-sm text-muted-foreground">Consulte dados e preços atuais antes de decidir.</p>
    <a href="/bikes" className="mt-3 inline-block text-sm font-semibold text-emerald-800 underline">Explorar bikes</a>
  </section>;
  if (block.type === "faq") return <FaqList faq={article.faq} />;
  if (block.type === "related") return <section className="my-8">
    <h2 className="text-xl font-bold">Continue sua pesquisa</h2>
    <div className="mt-3 flex flex-col gap-2">{relatedArticles.map(a =>
      <a key={a.id} href={`/conteudos/${a.slug}`} className="text-emerald-800 underline">{a.title}</a>)}</div>
    <div className="mt-4 flex flex-wrap gap-3"><a href="/radar" className="text-emerald-800 underline">Radar de preços</a>
      <a href="/bikes" className="text-emerald-800 underline">Catálogo de bikes</a></div>
  </section>;
  return null;
}

export function ArticleView({ article, bikes, relatedArticles = [], preview = false }: { article: PublishedArticle; bikes: CatalogBike[]; relatedArticles?: RelatedArticle[]; preview?: boolean }) {
  return <article className="mx-auto max-w-4xl px-4 py-10 text-foreground sm:px-6">
    {preview && <p className="mb-5 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-950">Preview privado — não publicado</p>}
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Conteúdo Vitale · vídeo original</p>
    <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{article.title}</h1>
    {article.publishedAt && <time dateTime={article.publishedAt} className="mt-3 block text-sm text-muted-foreground">
      Publicado em {new Date(article.publishedAt).toLocaleDateString("pt-BR")}</time>}
    {article.ogImageUrl && <img src={article.ogImageUrl} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />}
    <p className="mt-7 text-xl leading-8 text-muted-foreground">{article.summary}</p>
    {article.blocks.map((block, index) => <Block key={`${index}-${block.type}`} block={block} article={article} bikes={bikes} relatedArticles={relatedArticles} />)}
    {!article.blocks.some(b => b.type === "faq") && <FaqList faq={article.faq} />}
    <section className="my-10 border-t border-line pt-6 text-sm text-muted-foreground">
      <p>Este conteúdo foi produzido a partir de um vídeo real da Vitale. Preços e disponibilidade podem mudar; consulte o anúncio antes de comprar.</p>
      <a href={`https://www.youtube.com/watch?v=${article.videoId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-emerald-800 underline">Assistir ao vídeo original</a>
    </section>
  </article>;
}
