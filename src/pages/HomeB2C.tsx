import { Link, useLoaderData } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, Bus, Calculator, Car, CarTaxiFront } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import { SiteHeader, SiteFooter, BikeMedia, SectionHeading } from "@/components/site/site-ui";
import { HOME_PRODUCTS, ProductLink } from "@/components/home/home-products";
import type { HomeCard } from "@/lib/home-cards.functions";
import type { PublishedArticleSummary } from "@/lib/editorial-repository.server";
import { OffersBanner } from "@/components/site/DecisionBanners";
import { youtubeThumbnailVariant } from "@/lib/video-catalog";

/*
 * A Home usa catálogo e artigos publicados das fontes existentes. A newsletter
 * registra interesse consentido; envios permanecem desativados.
 * nenhum artigo/valor inventado. Dados de bikes vêm só de getHomeCards.
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
        <h1 className="entry-h1">
          Encontre a bike elétrica <span className="text-mint">certa para você</span>
        </h1>
        <p className="entry-lead max-w-xl">
          Testamos bikes, comparamos modelos, acompanhamos preços e criamos ferramentas para ajudar você a escolher.
        </p>
        <div className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Link to="/escolherbike" reloadDocument className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-mint px-7 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90">
            <Bike className="h-5 w-5 shrink-0" aria-hidden="true" /> <span className="sm:hidden">Faça o quiz e descubra a bike ideal</span><span className="hidden sm:inline">Escolher minha bike</span> <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
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

function BikesRow({ cards }: { cards: HomeCard[] }) {
  if (cards.length === 0) {
    return (
      <section id="bikes" className="responsive-container scroll-mt-24 pt-14">
        <SectionHeading id="bikes-monitoradas" title="Bikes monitoradas" sub="Veja todas as bikes acompanhadas no Radar de preços." action={<Link to="/radar" className="hover:underline">Abrir o Radar de preços</Link>} />
      </section>
    );
  }
  return (
    <section id="bikes" aria-labelledby="bikes-monitoradas" className="responsive-container scroll-mt-24 pt-14">
      <SectionHeading id="bikes-monitoradas" title="Bikes em destaque" sub="Preço atual registrado pelo Radar da Vitale." action={<Link to="/radar" className="inline-flex items-center gap-1 hover:underline">Ver Radar de preços <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((e) => (
          <li key={e.id}>
            <Link to="/radar/$bikeId" params={{ bikeId: e.id }} className={CARD_CLS}>
              <BikeMedia src={e.image} name={e.name} className="aspect-[4/3] w-full" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-bold text-ink">{e.name}</h3>
                <p className="mt-auto pt-3 text-2xl font-black text-action">{formatBRL(e.currentPrice)}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-action">Ver bike e histórico <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const CARD_CLS = "group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-action";

function RadarPanel({ total }: { total: number }) {
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
      <div className="relative mt-6 rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4" role="img" aria-label="Ilustração conceitual de histórico, tendência e comparação de preços; não representa dados reais">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs font-semibold text-mint">
          <span>Histórico</span><span>Tendência</span><span>Comparação</span>
        </div>
        <svg aria-hidden="true" viewBox="0 0 360 100" preserveAspectRatio="none" className="mt-3 h-24 w-full text-mint" fill="none">
          <path d="M0 25H360M0 50H360M0 75H360" stroke="currentColor" strokeOpacity=".16" />
          <path d="M4 78 C44 60 58 72 94 53 S150 42 183 60 S236 42 270 47 S322 19 356 27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M4 58 C46 65 68 40 104 47 S160 68 204 50 S257 64 303 35 S335 44 356 32" stroke="currentColor" strokeOpacity=".45" strokeWidth="2" strokeDasharray="5 5" />
        </svg>
      </div>
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
    <section aria-labelledby="ferramentas" className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
      {/* Alias de âncora para backlinks antigos (/#calc). Sem título duplicado. */}
      <span id="calc" aria-hidden="true" className="block scroll-mt-24" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-mint/20" />
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><Calculator className="h-6 w-6" aria-hidden="true" /></span>
        <p className="text-xs font-bold tracking-[0.2em] text-action">CALCULADORA DE ECONOMIA</p>
      </div>
      <h2 id="ferramentas" className="section-h2 relative mt-4 text-ink">E se o seu trajeto fosse de bike?</h2>
      <p className="relative mt-2 max-w-md text-muted-foreground">Descubra quanto você pode economizar trocando carro, Uber, ônibus ou outros meios por uma bike elétrica.</p>
      <div className="relative mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-surface p-4" aria-label="Composição conceitual: carro, Uber ou ônibus, com custo e trajeto informados por você, comparados à bike elétrica" role="img">
        <ul className="flex flex-1 basis-44 justify-around gap-2">
          {from.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-line"><Icon className="h-6 w-6" aria-hidden="true" /></span>
              <span className="text-xs font-semibold text-ink">{label}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-1 text-center text-xs font-semibold text-ink">
          <span>Custo</span><span>+</span><span>Trajeto</span>
        </div>
        <ArrowRight className="h-7 w-7 shrink-0 text-action" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-action text-primary-foreground shadow-lg ring-4 ring-mint/40"><Bike className="h-8 w-8" aria-hidden="true" /></span>
          <span className="text-xs font-bold text-action">Bike elétrica</span>
        </div>
      </div>
      <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link to="/ferramentas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-6 font-bold text-primary-foreground hover:opacity-90">
          Calcular minha economia <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link to="/escolherbike" reloadDocument className="text-sm font-semibold text-action underline underline-offset-2">Escolher minha bike</Link>
      </div>
    </section>
  );
}

function ArticlesBlock({ articles }: { articles: PublishedArticleSummary[] }) {
  if (articles.length === 0) return null;
  const recent = [...articles].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")).slice(0, 3);
  return (
    <section id="conteudos" aria-labelledby="artigos-home" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="artigos-home" className="border-l-4 border-action pl-3 text-2xl font-bold text-ink">Artigos para escolher melhor</h2>
        <Link to="/conteudos" className="inline-flex items-center gap-1 text-sm font-semibold text-action hover:underline">Ver todos os artigos <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
      </div>
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((article) => (
          <li key={article.slug}>
            <Link to="/conteudos/$slug" params={{ slug: article.slug }} className="group flex h-full flex-col overflow-hidden rounded-lg bg-card ring-1 ring-line transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action">
              {article.ogImageUrl && <img src={youtubeThumbnailVariant(article.ogImageUrl) ?? undefined} alt="" width={320} height={180} sizes="(max-width: 640px) 100vw, 33vw" loading="lazy" decoding="async" className="aspect-video w-full object-cover" />}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold text-ink group-hover:text-action">{article.title}</h3>
                {article.summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>}
                {article.publishedAt && !Number.isNaN(Date.parse(article.publishedAt)) && <time dateTime={article.publishedAt} className="mt-auto pt-4 text-xs text-muted-foreground">{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(article.publishedAt))}</time>}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

const HomeB2C = () => {
  const data = useLoaderData({ from: "/" });
  const ok = data?.ok === true;
  const cards = ok ? data.cards : [];
  const total = ok ? data.search.length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Shortcuts />
        <BikesRow cards={cards} />
        <div className="responsive-container space-y-14 py-14">
          <div className="grid gap-5 lg:grid-cols-2">
            <RadarPanel total={total} />
            <CalculatorPanel />
          </div>
          <ArticlesBlock articles={data?.articles ?? []} />
          <OffersBanner source="home" />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default HomeB2C;
