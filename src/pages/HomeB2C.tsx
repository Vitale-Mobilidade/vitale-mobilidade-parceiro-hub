import type { ReactNode } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import { VideoCards } from "@/components/site/VideoCards";
import type { VideoCard } from "@/lib/videos.functions";
import { ArrowRight, BarChart3, Bike, BookOpen, Bus, Calculator, Car, CarTaxiFront, GitCompareArrows, Lock, Mail, Megaphone, MessageCircle } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import { SiteHeader, SiteFooter, BikeMedia, SectionHeading, PriceStatus } from "@/components/site/site-ui";
import { HOME_PRODUCTS, ProductLink, InactiveButton } from "@/components/home/home-products";
import type { HomeCard, HomeRadarItem } from "@/lib/home-cards.functions";

/*
 * Sem backend ainda: comparador, calculadora (CTAs ativos levam só a rotas reais), conteúdos editoriais e newsletter.
 * CTAs inativos (disabled/aria-disabled, sem href/submit); nenhum email coletado;
 * nenhum vídeo/artigo/valor inventado. Dados de bikes vêm só de getHomeCards.
 */

function Hero() {
  return (
    <section className="entry-hero">
      <picture>
        <source media="(max-width: 767px)" srcSet="/vitale-hero-v2-mobile.webp" width={600} height={909} />
        <source media="(max-width: 1400px)" srcSet="/vitale-hero-v2-1280.webp" width={1280} height={720} />
        <img src="/vitale-hero-v2.webp" width={1672} height={941} alt="Ciclista em bike elétrica na orla da cidade ao pôr do sol" fetchPriority="high" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-transparent max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/70 max-md:to-ink/20" aria-hidden="true" />
      <div className="responsive-container entry-hero-inner">
        <p className="entry-eyebrow">BIKES ELÉTRICAS NO BRASIL</p>
        <h1 className="entry-h1">
          Encontre a bike elétrica <span className="text-mint">certa para você</span>
        </h1>
        <p className="entry-lead max-w-xl">
          Testamos bikes, comparamos modelos, acompanhamos preços e criamos ferramentas para ajudar você a escolher.
        </p>
        <div className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Link to="/escolherbike" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-mint px-7 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90">
            <Bike className="h-5 w-5" aria-hidden="true" /> Escolher minha bike <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/radar" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-mint/70 bg-ink/40 px-7 text-lg font-bold backdrop-blur-sm hover:bg-ink-foreground/10">
            <BarChart3 className="h-5 w-5" aria-hidden="true" /> Ver Radar de preços
          </Link>
        </div>
      </div>
    </section>
  );
}

function Shortcuts() {
  return (
    <nav aria-label="Produtos" className="responsive-container relative z-10 -mt-16 md:-mt-14">
      <ul className="grid grid-cols-2 overflow-hidden rounded-2xl bg-card shadow-xl ring-1 ring-line md:grid-cols-5 md:divide-x md:divide-line">
        {HOME_PRODUCTS.map(({ key, to, icon: Icon, title, sub }, i) => (
          <li key={key} className={i === 4 ? "col-span-2 border-t border-line md:col-span-1 md:border-t-0" : i < 4 ? "border-line max-md:border-b max-md:odd:border-r" : ""}>
            <ProductLink to={to} className="flex h-full items-center gap-3 p-4 transition-colors hover:bg-surface md:p-5">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/25 text-action"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block text-sm font-bold leading-tight text-ink md:text-[15px]">{title}</span><span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span></span>
            </ProductLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function BikesRow({ cards, slugs = {} }: { cards: HomeCard[]; slugs?: Record<string, string> }) {
  if (cards.length === 0) {
    return (
      <section id="bikes" className="responsive-container scroll-mt-24 pt-14">
        <SectionHeading id="bikes-monitoradas" title="Bikes monitoradas" sub="Veja todas as bikes acompanhadas no Radar de preços." action={<Link to="/radar" className="hover:underline">Abrir o Radar</Link>} />
      </section>
    );
  }
  return (
    <section id="bikes" aria-labelledby="bikes-monitoradas" className="responsive-container scroll-mt-24 pt-14">
      <SectionHeading id="bikes-monitoradas" title="Bikes em destaque" sub="Preço atual registrado pelo Radar da Vitale." action={<Link to="/bikes" className="inline-flex items-center gap-1 hover:underline">Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((e) => (
          <li key={e.id}>
            <CardLink slug={slugs[e.id]}>
              <BikeMedia src={e.image} name={e.name} className="aspect-[4/3] w-full" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-bold text-ink">{e.name}</h3>
                <p className="mt-auto pt-3 text-2xl font-black text-action">{formatBRL(e.currentPrice)}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-action">{slugs[e.id] ? "Ver detalhes" : "Ver catálogo"} <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </CardLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

const CARD_CLS = "group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-action";
// Sem slug editorial (falha temporária da planilha/divergência): leva ao catálogo, com rótulo "Ver catálogo".
function CardLink({ slug, children }: { slug?: string; children: ReactNode }) {
  return slug ? (
    <Link to="/bikes/$slug" params={{ slug }} className={CARD_CLS}>{children}</Link>
  ) : (
    <Link to="/bikes" className={CARD_CLS}>{children}</Link>
  );
}

function RadarPanel({ items, total }: { items: HomeRadarItem[]; total: number }) {
  const picks = items.slice(0, 3);
  return (
    <section aria-labelledby="radar-home" className="relative flex flex-col overflow-hidden rounded-3xl bg-vt-dark p-6 text-ink-foreground sm:p-8">
      {/* Decoração abstrata (não é dado) */}
      <svg aria-hidden="true" className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-mint/15" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="100" cy="100" r="30" /><circle cx="100" cy="100" r="60" /><circle cx="100" cy="100" r="90" /><path d="M100 100 L180 60" strokeWidth="3" />
      </svg>
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-mint-foreground"><BarChart3 className="h-6 w-6" aria-hidden="true" /></span>
        <p className="text-xs font-bold tracking-[0.2em] text-mint">RADAR DE PREÇOS</p>
      </div>
      <h2 id="radar-home" className="section-h2 relative mt-4">O preço de hoje está bom?</h2>
      <p className="relative mt-2 max-w-md text-ink-foreground/80">
        {total > 0 ? <><strong className="text-mint">{total} bikes</strong> monitoradas. Veja o preço atual e a classificação do Radar antes de comprar.</> : "Veja o preço atual e a classificação do Radar antes de comprar."}
      </p>
      {picks.length > 0 && (
        <ul className="relative mt-6 grid gap-3 sm:grid-cols-3">
          {picks.map((it) => (
            <li key={it.id}>
              <Link to="/radar/$bikeId" params={{ bikeId: it.id }} className="flex h-full items-center gap-3 rounded-2xl bg-ink-foreground/5 p-3 ring-1 ring-ink-foreground/10 transition hover:ring-mint/70 sm:flex-col sm:items-stretch">
                <BikeMedia src={it.image} name={it.name} className="h-16 w-16 shrink-0 rounded-xl bg-background sm:aspect-[4/3] sm:h-auto sm:w-full" />
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-bold leading-tight">{it.name}</p>
                  <p className="mt-1 text-lg font-black text-mint tabular-nums">{formatBRL(it.currentPrice)}</p>
                  <div className="mt-1"><PriceStatus classification={it.classification} /></div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link to="/radar" className="relative mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-mint px-6 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90 sm:w-fit">
        Explorar Radar de preços <ArrowRight className="h-5 w-5" aria-hidden="true" />
      </Link>
    </section>
  );
}

function CalculatorPanel() {
  const from = [
    { icon: Car, label: "Carro" },
    { icon: CarTaxiFront, label: "Uber" },
    { icon: Bus, label: "Ônibus" },
  ];
  return (
    <section aria-labelledby="calc" className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-mint/20" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><Calculator className="h-6 w-6" aria-hidden="true" /></span>
        <p className="text-xs font-bold tracking-[0.2em] text-action">CALCULADORA DE ECONOMIA</p>
      </div>
      <h2 id="calc" className="section-h2 relative mt-4 text-ink">E se o seu trajeto fosse de bike?</h2>
      <p className="relative mt-2 max-w-md text-muted-foreground">Descubra quanto você pode economizar trocando carro, Uber, ônibus ou outros meios por uma bike elétrica.</p>
      <div className="relative mt-6 flex items-center gap-3 rounded-2xl bg-surface p-4" aria-label="Troca de carro, Uber ou ônibus por bike elétrica" role="img">
        <ul className="flex flex-1 justify-around gap-2">
          {from.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-line"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <span className="text-xs font-semibold text-ink">{label}</span>
            </li>
          ))}
        </ul>
        <ArrowRight className="h-7 w-7 shrink-0 text-action" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-action text-primary-foreground shadow-lg ring-4 ring-mint/40"><Bike className="h-8 w-8" aria-hidden="true" /></span>
          <span className="text-xs font-bold text-action">Bike elétrica</span>
        </div>
      </div>
      <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link to="/escolherbike" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-6 font-bold text-primary-foreground hover:opacity-90">
          Escolher minha bike <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <p className="text-xs text-muted-foreground">A calculadora completa ainda está em desenvolvimento.</p>
      </div>
    </section>
  );
}

function CompareBlock({ cards }: { cards: HomeCard[] }) {
  const pair = cards.slice(0, 2);
  return (
    <section aria-labelledby="comparar" className="scroll-mt-24 overflow-hidden rounded-3xl bg-ink text-ink-foreground">
      <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] md:items-center">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-mint-foreground"><GitCompareArrows className="h-6 w-6" aria-hidden="true" /></span>
            <p className="text-xs font-bold tracking-[0.2em] text-mint">COMPARAR BIKES</p>
          </div>
          <h2 id="comparar" className="section-h2 mt-4">Em dúvida entre dois modelos?</h2>
          <p className="mt-2 max-w-md text-ink-foreground/80">Coloque as opções lado a lado e decida com calma. Por enquanto, explore os modelos e preços no Radar.</p>
          <Link to="/radar" className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90 sm:w-fit">
            Explorar modelos no Radar <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {pair.length === 2 && (
          <div className="relative grid grid-cols-2 gap-2 p-3 sm:p-4 md:pl-0">
            {pair.map((c) => (
              <Link key={c.id} to="/radar/$bikeId" params={{ bikeId: c.id }} className="overflow-hidden rounded-2xl bg-card text-ink ring-1 ring-ink-foreground/10 transition hover:ring-mint">
                <BikeMedia src={c.image} name={c.name} className="aspect-[4/3] w-full" />
                <p className="truncate px-3 py-3 text-center text-sm font-bold">{c.name}</p>
              </Link>
            ))}
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[42%] grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-mint text-lg font-black text-mint-foreground ring-4 ring-ink sm:h-16 sm:w-16">VS</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ContentBlock({ cards, videos }: { cards: HomeCard[]; videos: VideoCard[] }) {
  if (videos.length) {
    return (
      <section id="conteudos" aria-labelledby="conteudos-h" className="scroll-mt-24">
        <SectionHeading id="conteudos-h" title="Vídeos e testes" sub="Vídeos recentes do canal da Vitale no YouTube." icon={<BookOpen className="h-6 w-6 text-action" aria-hidden="true" />} />
        <VideoCards videos={videos} className="mt-6" />
      </section>
    );
  }
  const areas = [
    { tag: "Testes", title: "Testes de bikes elétricas", text: "Como as bikes se comportam no uso real." },
    { tag: "Comparativos", title: "Modelos lado a lado", text: "Diferenças que importam na hora de escolher." },
    { tag: "Guias", title: "Guias de compra", text: "O que avaliar antes de comprar sua bike." },
  ];
  return (
    <section id="conteudos" aria-labelledby="conteudos-h" className="scroll-mt-24">
      <SectionHeading id="conteudos-h" title="Conteúdos e testes" sub="Áreas editoriais da Vitale para ajudar na escolha." icon={<BookOpen className="h-6 w-6 text-action" aria-hidden="true" />} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {areas.map((a, i) => {
          const c = cards[(i + 2) % Math.max(cards.length, 1)];
          return (
            <li key={a.tag} className="overflow-hidden rounded-2xl bg-card ring-1 ring-line">
              <div className="relative">
                <BikeMedia src={c?.image ?? null} name={c?.name ?? a.title} className="aspect-[16/9] w-full" />
                <span className="absolute left-3 top-3 rounded-full bg-mint px-3 py-1 text-xs font-bold text-mint-foreground">{a.tag}</span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-ink">{a.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{a.text}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GroupAndNewsletter() {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section aria-labelledby="grupo-ofertas" className="flex flex-col gap-5 rounded-3xl bg-vt-dark p-6 text-ink-foreground sm:flex-row sm:items-center sm:p-8">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-mint text-mint-foreground"><MessageCircle className="h-8 w-8" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="grupo-ofertas" className="text-xl font-bold sm:text-2xl">Grupo de ofertas no WhatsApp</h2>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-foreground/80"><Megaphone className="h-4 w-4 shrink-0 text-mint" aria-hidden="true" /> Somente admins publicam ofertas de bikes elétricas.</p>
        </div>
        <Link to="/grupodeofertas" className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border-2 border-mint px-5 font-bold hover:bg-mint hover:text-mint-foreground">
          Entrar no grupo <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
      <section aria-labelledby="newsletter" className="rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/25 text-action"><Mail className="h-6 w-6" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 id="newsletter" className="text-xl font-bold text-ink sm:text-2xl">Newsletter Vitale</h2>
            <p className="mt-1 text-sm text-muted-foreground">Novidades sobre bikes elétricas, preços e ferramentas.</p>
          </div>
        </div>
        {/* Sem <form>, sem name, sem submit: nenhum dado é coletado. */}
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <label htmlFor="nl-email" className="sr-only">Seu email</label>
          <input id="nl-email" type="email" disabled aria-disabled="true" placeholder="seu@email.com" className="h-12 min-w-0 flex-1 cursor-not-allowed rounded-xl border border-input bg-muted px-4 text-sm opacity-60" />
          <InactiveButton className="h-12 rounded-xl bg-action px-6 font-bold text-primary-foreground">Quero receber</InactiveButton>
        </div>
        <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="h-3.5 w-3.5" aria-hidden="true" /> Nenhum email é coletado nesta página.</p>
      </section>
    </div>
  );
}

const HomeB2C = () => {
  const data = useLoaderData({ from: "/" });
  const ok = data?.ok === true;
  const cards = ok ? data.cards : [];
  const radar = ok ? data.radar : [];
  const total = ok ? data.search.length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Shortcuts />
        <BikesRow cards={cards} slugs={data?.bikeSlugs} />
        <div className="responsive-container space-y-14 py-14">
          <div className="grid gap-5 lg:grid-cols-2">
            <RadarPanel items={radar} total={total} />
            <CalculatorPanel />
          </div>
          <CompareBlock cards={cards} />
          <ContentBlock cards={cards} videos={data?.videos ?? []} />
          <GroupAndNewsletter />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default HomeB2C;
