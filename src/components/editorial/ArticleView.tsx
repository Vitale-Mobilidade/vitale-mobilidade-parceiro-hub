import type React from "react";
import type { CatalogBike } from "@/lib/editorial-bikes";
import { trackAffiliateClick } from "@/lib/affiliate-analytics";
import { QuizBanner } from "@/components/site/DecisionBanners";
import type { ArticleBlock, ArticleFaq } from "../../../supabase/functions/_shared/editorial-contract";
import type { VideoCard } from "@/lib/videos.functions";

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
  if (mode === "cta") return <section className="my-10 rounded-2xl bg-emerald-950 p-6 text-white sm:p-8">
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-300">Próximo passo</p>
    <h2 className="mt-2 text-2xl font-bold">Confira a oferta atual da {bike.name}</h2>
    <p className="mt-2 max-w-2xl text-emerald-100">Preço e disponibilidade são definidos pelo anúncio no Mercado Livre. Confira os detalhes antes de decidir.</p>
    {bike.link && bike.sheetPrice != null ? <a href={bike.link} target="_blank" rel="sponsored noopener noreferrer"
      onClick={() => trackAffiliateClick({ bike_id: bike.bikeId, position: "content_article" })}
      className="mt-5 inline-block rounded-lg bg-emerald-300 px-5 py-3 font-semibold text-emerald-950">Ver oferta no Mercado Livre</a>
      : <p className="mt-5 font-semibold">Link indisponível no momento.</p>}
  </section>;
  if (mode === "specs") return <section className="my-8 rounded-2xl bg-surface p-5 sm:p-7">
    <h2 className="text-2xl font-bold">{bike.name}: dados da bike</h2>
    <p className="mt-3 text-muted-foreground">{[bike.autonomy, bike.capacity].filter(Boolean).join(" · ") || "Confira os dados cadastrados na página da bike."}</p>
     <a href={`/radar/${encodeURIComponent(bike.bikeId)}`} className="mt-4 inline-block font-semibold text-emerald-800 underline">Ver bike e histórico</a>
  </section>;
  return <section className="my-8 rounded-2xl border border-line bg-emerald-50 p-5 sm:p-7">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {bike.image && <img src={bike.image} alt={`Bike elétrica ${bike.name}`} loading="lazy" className="h-36 w-full rounded-xl bg-white object-contain sm:w-48" />}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Radar Vitale</p>
        <h2 className="mt-1 text-xl font-bold">O preço da {bike.name} está bom?</h2>
        {bike.sheetPrice != null && bike.link && <p className="mt-2 text-2xl font-bold text-emerald-800">{BRL.format(bike.sheetPrice)}</p>}
        <div className="mt-4 flex flex-wrap gap-2">
           <a href={`/radar/${encodeURIComponent(bike.bikeId)}`} className="rounded-lg border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-900">Conhecer a bike</a>
          <a href={`/radar/${bike.bikeId}`} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">Ver histórico no Radar</a>
        </div>
        {!bike.link && <p className="mt-2 text-sm text-muted-foreground">Link indisponível no momento.</p>}
      </div>
    </div>
  </section>;
}

type RelatedArticle = { id: string; slug: string; title: string };
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
  if (["radar", "specs", "cta"].includes(block.type) && block.bikeId) {
    return <BikeDecision bikeId={block.bikeId} bikes={bikes} mode={block.type as "radar" | "specs" | "cta"} />;
  }
  if (block.type === "quiz") return <div className="my-8"><QuizBanner /></div>;
  if (block.type === "comparator") {
    const compared = [...new Set([block.bikeId, ...article.relatedBikeIds].filter((id): id is string => Boolean(id)))]
      .map(id => bikes.find(bike => bike.bikeId === id)).filter((bike): bike is CatalogBike => Boolean(bike)).slice(0, 2);
    if (compared.length < 2) return null;
    const rows: [string, (b: CatalogBike) => React.ReactNode][] = [
      ["Preço atual", b => b.sheetPrice != null && b.link ? <strong className="text-emerald-800">{BRL.format(b.sheetPrice)}</strong> : "Sem oferta no momento"],
      ["Autonomia", b => b.autonomy ?? "—"],
      ["Capacidade", b => b.capacity ?? "—"],
    ];
    return <section className="my-10">
      <h2 className="mb-4 text-2xl font-bold">{block.heading || "Comparação lado a lado"}</h2>
      <div className="overflow-x-auto rounded-2xl border border-line"><table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-surface"><tr><th className="p-3" scope="col"><span className="sr-only">Item</span></th>{compared.map(b => <th key={b.bikeId} scope="col" className="p-3 align-bottom">
          {b.image && <img src={b.image} alt={`Bike elétrica ${b.name}`} loading="lazy" className="mb-2 h-24 w-full object-contain" />}
          <span className="font-bold">{b.name}</span></th>)}</tr></thead>
        <tbody>{rows.map(([label, value]) => <tr key={label} className="border-t border-line"><th scope="row" className="p-3 font-medium text-muted-foreground">{label}</th>
          {compared.map(b => <td key={b.bikeId} className="p-3">{value(b)}</td>)}</tr>)}
          <tr className="border-t border-line"><th scope="row" className="p-3"><span className="sr-only">Links</span></th>{compared.map(b => <td key={b.bikeId} className="space-y-1 p-3">
             <a href={`/radar/${encodeURIComponent(b.bikeId)}`} className="block font-semibold text-emerald-800 underline">Conhecer bike</a>
            <a href={`/radar/${b.bikeId}`} className="block text-emerald-800 underline">Ver no Radar</a>
            {b.link && b.sheetPrice != null && <a href={b.link} target="_blank" rel="sponsored noopener noreferrer"
              onClick={() => trackAffiliateClick({ bike_id: b.bikeId, position: "content_article" })}
              className="block text-emerald-800 underline">Ver oferta no Mercado Livre</a>}
          </td>)}</tr></tbody>
      </table></div>
      <p className="mt-2 text-xs text-muted-foreground">Preço e disponibilidade vêm do anúncio atual e podem mudar.</p>
    </section>;
  }
  if (block.type === "faq") return <FaqList faq={article.faq} />;
  if (block.type === "related") return null;
  return null;
}

export function ArticleView({ article, bikes, relatedArticles = [], relatedVideos = [], preview = false }: { article: PublishedArticle; bikes: CatalogBike[]; relatedArticles?: RelatedArticle[]; relatedVideos?: VideoCard[]; preview?: boolean }) {
  return <article className="mx-auto max-w-4xl px-4 py-10 text-foreground sm:px-6">
    {preview && <p className="mb-5 rounded-lg bg-amber-100 p-3 text-sm font-semibold text-amber-950">Preview privado — não publicado</p>}
    <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">Conteúdo Vitale</p>
    <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{article.title}</h1>
    {article.publishedAt && <time dateTime={article.publishedAt} className="mt-3 block text-sm text-muted-foreground">
      Publicado em {new Date(article.publishedAt).toLocaleDateString("pt-BR")}</time>}
    {article.ogImageUrl && <img src={article.ogImageUrl} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />}
    <p className="mt-7 text-xl leading-8 text-muted-foreground">{article.summary}</p>
    {article.blocks.map((block, index) => <Block key={`${index}-${block.type}`} block={block} article={article} bikes={bikes} relatedArticles={relatedArticles} />)}
    {!article.blocks.some(b => b.type === "faq") && <FaqList faq={article.faq} />}
    {relatedArticles.length > 0 && <section className="my-10"><h2 className="text-2xl font-bold">Continue sua pesquisa</h2>
      <ul className="mt-4 space-y-2">{relatedArticles.map(a => <li key={a.id}><a href={`/conteudos/${a.slug}`} className="font-semibold text-emerald-800 underline">{a.title}</a></li>)}</ul></section>}
    {relatedVideos.length > 0 && <section className="my-10"><h2 className="text-2xl font-bold">Outros vídeos da Vitale sobre esta bike</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{relatedVideos.map(video => <a key={video.videoId} href={video.url}
        target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-xl border border-line hover:border-emerald-500">
        <img src={video.thumbnail} alt="" loading="lazy" className="aspect-video w-full object-cover" />
        <span className="block p-4 font-semibold">{video.title}</span>
      </a>)}</div></section>}
    <section className="my-10 border-t border-line pt-6 text-sm text-muted-foreground">
      <p>Conteúdo baseado nos testes práticos da Vitale. Preços e disponibilidade podem mudar; consulte o anúncio antes de comprar.</p>
      <a href={`https://www.youtube.com/watch?v=${article.videoId}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-emerald-800 underline">Assistir no YouTube</a>
    </section>
  </article>;
}
