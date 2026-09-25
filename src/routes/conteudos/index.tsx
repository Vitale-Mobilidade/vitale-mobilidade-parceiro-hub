import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, ArrowRight, BookOpen, LineChart, Wrench } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { QuizBanner, OffersBanner } from "@/components/site/DecisionBanners";
import { getPublishedArticles } from "@/lib/editorial.functions";
import { normalizeText } from "@/lib/price-daily";
import { formatDateBR } from "@/lib/price-tracker";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/conteudos/")({
  loader: async () => {
    const items = await getPublishedArticles();
    if (!items) throw new Error("conteudos_unavailable");
    return items;
  },
  head: () => pageHead({ path: "/conteudos", title: "Conteúdos e testes de bikes elétricas | Vitale Mobilidade",
    description: "Testes reais, guias e comparativos da Vitale para ajudar você a escolher sua bike elétrica." }),
  component: ContentIndex,
});

// O índice editorial não tem categoria persistida: só oferecemos filtros se o título/resumo publicado a indicar.
const TOPICS = [
  { label: "Comparativos", pattern: /comparativ|\bcompar(ar|ando)\b|\bvs\.?\b|\bou\b/i },
  { label: "Guias", pattern: /\bguia(s)?\b|\bcomo escolher\b/i },
  { label: "Testes", pattern: /\bteste(s)?\b|\banálise(s)?\b/i },
] as const;

function ContentIndex() {
  const items = Route.useLoaderData();
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const topics = useMemo(() => TOPICS.filter(t => items.some(item => t.pattern.test(`${item.title} ${item.summary}`))), [items]);
  const shown = useMemo(() => items.filter(item => {
    const text = normalizeText(`${item.title} ${item.summary}`);
    return text.includes(normalizeText(query)) && (!topic || TOPICS.find(t => t.label === topic)?.pattern.test(`${item.title} ${item.summary}`));
  }), [items, query, topic]);
  return <div className="min-h-screen bg-background"><SiteHeader />
    <main>
      <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
        <img src="/vitale-hero-radar-2026-1280.webp" width={1280} height={720} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/90 to-ink/40 max-md:bg-ink/75" aria-hidden="true" />
        <div className="responsive-container py-16 sm:py-24"><p className="text-sm font-bold uppercase tracking-widest text-mint">Conteúdo Vitale</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-extrabold sm:text-5xl">Conteúdos para escolher melhor</h1>
          <p className="mt-4 max-w-xl text-lg text-ink-foreground/90">Guias, comparativos e testes publicados pela Vitale para apoiar sua escolha.</p>
        </div>
      </section>
      <div className="responsive-container space-y-12 py-12">
        <section aria-labelledby="artigos"><h2 id="artigos" className="section-h2 text-ink">Artigos publicados</h2>
          <div className="mt-6 max-w-lg"><label htmlFor="buscar-artigos" className="mb-2 block text-sm font-semibold">Buscar por título ou resumo</label>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-card px-4 focus-within:ring-2 focus-within:ring-action"><Search className="h-5 w-5 text-muted-foreground" aria-hidden="true" /><input id="buscar-artigos" type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar artigos" className="h-12 min-w-0 flex-1 bg-transparent outline-none" /></div>
          </div>
          {topics.length > 0 && <div className="mt-5 flex flex-wrap gap-2" aria-label="Filtrar artigos por assunto">{["Todos", ...topics.map(t => t.label)].map(label => <button key={label} type="button" aria-pressed={topic === (label === "Todos" ? "" : label)} onClick={() => setTopic(label === "Todos" ? "" : label)} className={`min-h-11 rounded-full border px-4 text-sm focus-visible:ring-2 focus-visible:ring-action ${topic === (label === "Todos" ? "" : label) ? "border-action bg-action text-white" : "border-line bg-card"}`}>{label}</button>)}</div>}
          {shown.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{shown.map(item => <Link key={item.slug} to="/conteudos/$slug" params={{ slug: item.slug }} className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-card focus-visible:ring-2 focus-visible:ring-action hover:shadow-md">
            {item.ogImageUrl ? <img src={item.ogImageUrl} alt="" width={640} height={360} loading="lazy" decoding="async" className="aspect-video w-full object-cover" /> : <div className="grid aspect-video place-items-center bg-surface"><BookOpen className="h-10 w-10 text-action" aria-hidden="true" /></div>}
            <div className="flex flex-1 flex-col p-5">{item.publishedAt && <time dateTime={item.publishedAt} className="text-xs text-muted-foreground">{formatDateBR(item.publishedAt)}</time>}<h3 className="mt-2 text-xl font-bold text-ink group-hover:text-action">{item.title}</h3><p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.summary}</p><span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-semibold text-action">Ler artigo <ArrowRight className="h-4 w-4" aria-hidden="true" /></span></div>
          </Link>)}</div> : <p className="mt-8 rounded-xl bg-surface p-6 text-muted-foreground">{items.length ? "Nenhum artigo encontrado com esta busca e filtro." : "Ainda não há conteúdos editoriais publicados."}</p>}
        </section>
        <section aria-labelledby="proximos-conteudos"><h2 id="proximos-conteudos" className="section-h2 text-ink">Próximos passos</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link to="/radar" className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 font-bold text-ink hover:border-action focus-visible:ring-2 focus-visible:ring-action"><LineChart className="h-6 w-6 text-action" aria-hidden="true" /> Radar de preços <ArrowRight className="ml-auto h-5 w-5" aria-hidden="true" /></Link>
          <Link to="/ferramentas" className="flex items-center gap-4 rounded-2xl border border-line bg-card p-5 font-bold text-ink hover:border-action focus-visible:ring-2 focus-visible:ring-action"><Wrench className="h-6 w-6 text-action" aria-hidden="true" /> Ferramentas <ArrowRight className="ml-auto h-5 w-5" aria-hidden="true" /></Link></div></section>
        <QuizBanner /><OffersBanner />
      </div>
    </main><SiteFooter /></div>;
}
