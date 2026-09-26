import type React from "react";
import type { CatalogBike } from "@/lib/editorial-bikes";
import { QuizBanner } from "@/components/site/DecisionBanners";
import { ArrowRight, BookOpen, LineChart, Sparkles } from "lucide-react";
import type { ArticleBlock, ArticleFaq } from "../../../supabase/functions/_shared/editorial-contract";
import type { VideoCard } from "@/lib/videos.functions";

export type PublishedArticle = {
  id: string; slug: string; title: string; summary: string; blocks: ArticleBlock[]; faq: ArticleFaq[];
  seoTitle: string; metaDescription: string; ogTitle: string; ogDescription: string;
  ogImageUrl: string | null; indexable: boolean; publishedAt: string | null;
  videoId: string; primaryBikeId: string | null; relatedBikeIds: string[]; relatedArticleIds: string[];
};

function BikeDecision({ bikeId, bikes, mode }: { bikeId: string; bikes: CatalogBike[]; mode: "radar" | "specs" }) {
  const bike = bikes.find(b => b.bikeId === bikeId);
  if (!bike) return null;
  if (mode === "specs") return <section className="my-8 rounded-2xl bg-surface p-5 sm:p-7">
    <h2 className="text-2xl font-bold">{bike.name}: dados da bike</h2>
    <p className="mt-3 text-muted-foreground">{[bike.autonomy, bike.capacity].filter(Boolean).join(" · ") || "Confira os dados cadastrados na página da bike."}</p>
    <a href={`/radar/${encodeURIComponent(bike.bikeId)}`} className="mt-4 inline-block font-semibold text-emerald-800 underline">Ver ficha completa da bike</a>
  </section>;
  return <section className="my-8 rounded-2xl border border-line bg-emerald-50 p-5 sm:p-7">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {bike.image && <img src={bike.image} alt={`Bike elétrica ${bike.name}`} loading="lazy" className="h-36 w-full rounded-xl bg-white object-contain sm:w-48" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Radar Vitale</p>
        <h2 className="mt-1 text-xl font-bold">Confira o preço da {bike.name} no Radar</h2>
        <p className="mt-2 text-sm text-muted-foreground">Veja a variação registrada, os dados da bike e a oferta disponível antes de sair para comprar.</p>
        <a href={`/radar/${encodeURIComponent(bike.bikeId)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Ver preço e histórico <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
      </div>
    </div>
  </section>;
}

type RelatedArticle = { id: string; slug: string; title: string; summary?: string; ogImageUrl?: string | null; publishedAt?: string | null };
function InlineText({ value }: { value: string }) {
  return <>{value.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**")
    ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part}</span>)}</>;
}
function EditorialBody({ text }: { text: string }) {
  return <div className="space-y-4 leading-8">{text.split(/\n\s*\n/g).filter(Boolean).map((paragraph, index) => {
    const lines = paragraph.split("\n");
    if (lines.every(line => /^\d+[.)]\s+/.test(line.trim()))) return <ol key={index} className="list-decimal space-y-1 pl-6">
      {lines.map((line, lineIndex) => <li key={lineIndex}><InlineText value={line.replace(/^\s*\d+[.)]\s+/, "")} /></li>)}</ol>;
    if (lines.every(line => /^[-•*]\s+/.test(line.trim()))) return <ul key={index} className="list-disc space-y-1 pl-6">
      {lines.map((line, lineIndex) => <li key={lineIndex}><InlineText value={line.replace(/^\s*[-•]\s+/, "")} /></li>)}</ul>;
    if (lines.length >= 2 && lines.every(line => /^\s*\|.*\|\s*$/.test(line))) {
      const rows = lines.filter(line => !/^\s*\|[\s:|-]+\|\s*$/.test(line)).map(line => line.trim().slice(1, -1).split("|").map(c => c.trim()));
      return <div key={index} className="overflow-x-auto"><table className="w-full min-w-[480px] border-collapse text-left text-sm">
        <thead><tr>{rows[0].map((c, i) => <th key={i} className="border-b-2 border-line p-2 font-semibold"><InlineText value={c} /></th>)}</tr></thead>
        <tbody>{rows.slice(1).map((r, ri) => <tr key={ri} className="border-b border-line">{r.map((c, i) => <td key={i} className="p-2 align-top"><InlineText value={c} /></td>)}</tr>)}</tbody>
      </table></div>;
    }
    if (paragraph.startsWith("### ")) return <h3 key={index} className="text-xl font-bold"><InlineText value={paragraph.slice(4)} /></h3>;
    if (paragraph.startsWith("> ")) return <blockquote key={index} className="border-l-4 border-emerald-400 pl-4 italic"><InlineText value={paragraph.slice(2)} /></blockquote>;
    return <p key={index} className="whitespace-pre-line"><InlineText value={paragraph} /></p>;
  })}</div>;
}
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
    {block.text && <EditorialBody text={block.text} />}
  </section>;
  if (block.type === "video") return <section className="my-8">
    <h2 className="mb-3 text-2xl font-bold">{block.heading || "Teste em vídeo"}</h2>
    <div className="aspect-video overflow-hidden rounded-xl bg-emerald-950">
      <iframe src={`https://www.youtube-nocookie.com/embed/${article.videoId}`} title={block.heading || "Vídeo da Vitale"}
        loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="h-full w-full" />
    </div>
  </section>;
  if (block.type === "specs" && block.bikeId) {
    return <BikeDecision bikeId={block.bikeId} bikes={bikes} mode="specs" />;
  }
  if (block.type === "quiz") return <div className="my-8"><QuizBanner /></div>;
  if (block.type === "comparator") {
    const compared = [...new Set([block.bikeId, ...article.relatedBikeIds].filter((id): id is string => Boolean(id)))]
      .map(id => bikes.find(bike => bike.bikeId === id)).filter((bike): bike is CatalogBike => Boolean(bike)).slice(0, 2);
    if (compared.length < 2) return null;
    const rows: [string, (b: CatalogBike) => React.ReactNode][] = [
      ["Autonomia", b => b.autonomy ?? "—"],
      ["Capacidade", b => b.capacity ?? "—"],
      ["Categoria", b => b.category ?? "—"],
    ];
    return <section className="my-10">
      <h2 className="mb-4 text-2xl font-bold">{block.heading || "Comparação lado a lado"}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line"><table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-surface"><tr><th className="p-3" scope="col"><span className="sr-only">Item</span></th>{compared.map(b => <th key={b.bikeId} scope="col" className="p-3 align-bottom">
          {b.image && <img src={b.image} alt={`Bike elétrica ${b.name}`} loading="lazy" className="mb-2 h-24 w-full object-contain" />}
          <span className="font-bold">{b.name}</span></th>)}</tr></thead>
        <tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-line"><th scope="row" className="p-3 font-medium text-muted-foreground">{label}</th>
          {compared.map(b => <td key={b.bikeId} className="p-3">{value(b)}</td>)}</tr>)}
          <tr className="border-t border-line"><th scope="row" className="p-3"><span className="sr-only">Próximo passo</span></th>{compared.map(b => <td key={b.bikeId} className="p-3">
            <a href={`/radar/${encodeURIComponent(b.bikeId)}`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-emerald-800 underline">Conhecer {b.name} no Radar <ArrowRight className="h-4 w-4" aria-hidden="true" /></a>
          </td>)}</tr></tbody>
      </table></div>
      <p className="mt-2 text-sm text-muted-foreground">Preços e ofertas atualizados estão nas páginas de cada bike.</p>
    </section>;
  }
  if (block.type === "faq") return <FaqList faq={article.faq} />;
  if (block.type === "related") return null;
  return null;
}

export function ArticleView({ article, bikes, relatedArticles = [], articlesShareContext = true, relatedVideos = [], preview = false }: { article: PublishedArticle; bikes: CatalogBike[]; relatedArticles?: RelatedArticle[]; articlesShareContext?: boolean; relatedVideos?: VideoCard[]; preview?: boolean }) {
  const connectedBikes = [...new Set([article.primaryBikeId, ...article.relatedBikeIds].filter((id): id is string => Boolean(id)))]
    .map(id => bikes.find(bike => bike.bikeId === id)).filter((bike): bike is CatalogBike => Boolean(bike));
  const analysisBlocks = article.blocks.filter(block => !["radar", "cta", "quiz", "related"].includes(block.type));
  const radarBlocks = article.blocks.filter(block => ["radar", "cta"].includes(block.type) && block.bikeId);
  const radarBikeIds = [...new Set((radarBlocks.length ? radarBlocks.map(block => block.bikeId) : [article.primaryBikeId])
    .filter((id): id is string => Boolean(id)))];
  return <div className="responsive-container grid gap-10 py-10 text-foreground lg:grid-cols-[minmax(0,1fr)_280px] xl:gap-14">
  <article className="min-w-0 max-w-3xl">
    {preview && <p className="mb-5 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-950">Preview privado — não publicado</p>}
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Conteúdo Vitale</p>
    <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{article.title}</h1>
    {article.publishedAt && <time dateTime={article.publishedAt} className="mt-3 block text-sm text-muted-foreground">
      Publicado em {new Date(article.publishedAt).toLocaleDateString("pt-BR")}</time>}
    {article.ogImageUrl && <img src={article.ogImageUrl} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />}
    <p className="mt-7 text-xl leading-8 text-muted-foreground">{article.summary}</p>
    {analysisBlocks.map((block, index) => <Block key={`${index}-${block.type}`} block={block} article={article} bikes={bikes} relatedArticles={relatedArticles} />)}
    {!article.blocks.some(b => b.type === "faq") && <FaqList faq={article.faq} />}
    {radarBikeIds.length > 0 && <section aria-labelledby="radar-no-artigo" className="my-12 border-t border-line pt-8">
      <p className="text-xs font-bold uppercase tracking-widest text-action">Da análise à decisão</p>
      <h2 id="radar-no-artigo" className="mt-2 text-2xl font-bold">Preços e histórico das bikes citadas</h2>
      <p className="mt-2 text-muted-foreground">Os modelos abaixo têm ficha e acompanhamento de preço próprios. Confira o Radar antes de abrir a oferta.</p>
      {radarBikeIds.map(id => <BikeDecision key={id} bikeId={id} bikes={bikes} mode="radar" />)}
    </section>}
    <div className="my-10"><QuizBanner /></div>
    {relatedArticles.length > 0 && <section className="my-10"><h2 className="text-2xl font-bold">{articlesShareContext ? "Continue sua pesquisa" : "Explore outros conteúdos"}</h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2">{relatedArticles.map(a => <li key={a.id}><a href={`/conteudos/${a.slug}`} className="group block h-full overflow-hidden rounded-2xl border border-line bg-card hover:border-action focus-visible:ring-2 focus-visible:ring-action">
        {a.ogImageUrl ? <img src={a.ogImageUrl} alt="" loading="lazy" className="aspect-video w-full object-cover" /> : <span className="grid aspect-video place-items-center bg-surface"><BookOpen className="h-8 w-8 text-action" aria-hidden="true" /></span>}
        <span className="block p-4"><strong className="block leading-snug text-ink group-hover:text-action">{a.title}</strong>{a.summary && <span className="mt-2 line-clamp-2 block text-sm text-muted-foreground">{a.summary}</span>}<span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-action">Ler artigo <ArrowRight className="h-4 w-4" aria-hidden="true" /></span></span>
      </a></li>)}</ul></section>}
    {relatedVideos.length > 0 && <section className="my-10"><h2 className="text-2xl font-bold">Outros vídeos da Vitale sobre esta bike</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{relatedVideos.map(video => <a key={video.videoId} href={video.url}
        target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-line hover:border-emerald-500">
        <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        <span className="block p-4 font-semibold">{video.title}</span>
      </a>)}</div></section>}
    <section className="my-10 border-t border-line pt-6 text-sm text-muted-foreground">
      <p>Conteúdo baseado nos testes práticos da Vitale. Preços e disponibilidade podem mudar; consulte o Radar da bike antes de comprar.</p>
      <a href={`https://www.youtube.com/watch?v=${article.videoId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-emerald-800 underline">Assistir no YouTube</a>
    </section>
  </article>
  <aside className="space-y-5 lg:pt-3" aria-label="Explore conteúdos relacionados">
    <div className="rounded-2xl border border-line bg-surface p-5"><Sparkles className="h-6 w-6 text-action" aria-hidden="true" /><h2 className="mt-3 text-xl font-bold">Qual bike combina com você?</h2><p className="mt-2 text-sm text-muted-foreground">Responda ao Quiz da Vitale e descubra modelos para o seu uso.</p><a href="/escolherbike" className="mt-4 inline-flex min-h-11 items-center gap-2 font-bold text-action underline">Fazer o quiz <ArrowRight className="h-4 w-4" aria-hidden="true" /></a></div>
    {connectedBikes.length > 0 && <div className="rounded-2xl border border-line bg-card p-5"><h2 className="flex items-center gap-2 text-lg font-bold"><LineChart className="h-5 w-5 text-action" aria-hidden="true" /> Bikes deste artigo</h2><ul className="mt-4 space-y-3">{connectedBikes.slice(0, 4).map(bike => <li key={bike.bikeId}><a href={`/radar/${encodeURIComponent(bike.bikeId)}`} className="flex min-h-12 items-center gap-3 rounded-lg hover:text-action focus-visible:ring-2 focus-visible:ring-action">{bike.image && <img src={bike.image} alt="" loading="lazy" className="h-12 w-16 rounded bg-surface object-contain" />}<span className="min-w-0 flex-1 font-semibold">{bike.name}</span><ArrowRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a></li>)}</ul></div>}
    {relatedArticles.length > 0 && <div className="rounded-2xl border border-line bg-card p-5"><h2 className="text-lg font-bold">{articlesShareContext ? "Leia também" : "Mais conteúdos"}</h2><ul className="mt-3 divide-y divide-line">{relatedArticles.slice(0, 3).map(a => <li key={a.id}><a href={`/conteudos/${a.slug}`} className="flex min-h-12 items-center gap-2 py-3 font-semibold leading-snug hover:text-action focus-visible:ring-2 focus-visible:ring-action"><BookOpen className="h-4 w-4 shrink-0 text-action" aria-hidden="true" />{a.title}</a></li>)}</ul></div>}
  </aside>
  </div>;
}
