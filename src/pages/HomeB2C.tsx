import { Link, useLoaderData } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, BookOpen, Bus, Calculator, Car, CarTaxiFront, GitCompareArrows, Lock, Mail, Megaphone, MessageCircle } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import { SiteHeader, SiteFooter, BikeMedia, SectionHeading, PriceStatus } from "@/components/site/site-ui";
import { HOME_PRODUCTS, ProductLink, InactiveButton } from "@/components/home/home-products";
import type { HomeCard, HomeRadarItem } from "@/lib/home-cards.functions";

/*
 * Sem backend ainda: comparador, calculadora, conteúdos editoriais e newsletter.
 * CTAs inativos (disabled/aria-disabled, sem href/submit); nenhum email coletado;
 * nenhum vídeo/artigo/valor inventado. Dados de bikes vêm só de getHomeCards.
 */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      <picture>
        <source media="(max-width: 767px)" srcSet="/vitale-hero-v2-mobile.webp" width={600} height={909} />
        <source media="(max-width: 1400px)" srcSet="/vitale-hero-v2-1280.webp" width={1280} height={720} />
        <img src="/vitale-hero-v2.webp" width={1672} height={941} alt="Ciclista em bike elétrica na orla da cidade ao pôr do sol" fetchPriority="high" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-transparent max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/70 max-md:to-ink/20" aria-hidden="true" />
      <div className="responsive-container flex min-h-[560px] flex-col justify-end pb-28 pt-40 md:min-h-[640px] md:justify-center md:pb-36 md:pt-16">
        <p className="text-xs font-bold tracking-[0.25em] text-mint">BIKES ELÉTRICAS NO BRASIL</p>
        <h1 className="mt-4 max-w-3xl text-[2.6rem] font-black leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl">
          Encontre a bike elétrica <span className="text-mint">certa para você</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-ink-foreground/90 sm:text-xl">
          Testamos bikes, comparamos modelos, acompanhamos preços e criamos ferramentas para ajudar você a escolher.
        </p>
        <div className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Link to="/escolherbike" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-mint px-7 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90">
            <Bike className="h-5 w-5" aria-hidden="true" /> Escolher minha bike <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </Link>
          <Link to="/acompanhamento" className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-mint/70 bg-ink/40 px-7 text-lg font-bold backdrop-blur-sm hover:bg-ink-foreground/10">
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
        <SectionHeading id="bikes-monitoradas" title="Bikes monitoradas" sub="Veja todas as bikes acompanhadas no Radar de preços." action={<Link to="/acompanhamento" className="hover:underline">Abrir o Radar</Link>} />
      </section>
    );
  }
  return (
    <section id="bikes" aria-labelledby="bikes-monitoradas" className="responsive-container scroll-mt-24 pt-14">
      <SectionHeading id="bikes-monitoradas" title="Bikes em destaque" sub="Preço atual registrado pelo Radar da Vitale." action={<Link to="/acompanhamento" className="inline-flex items-center gap-1 hover:underline">Ver todas <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>} />
      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((e) => (
          <li key={e.id}>
            <Link to="/acompanhamento/$bikeId" params={{ bikeId: e.id }} className="group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-action">
              <BikeMedia src={e.image} name={e.name} className="aspect-[4/3] w-full" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-bold text-ink">{e.name}</h3>
                <p className="mt-auto pt-3 text-2xl font-black text-action">{formatBRL(e.currentPrice)}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-action">Ver detalhes <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function RadarPanel({ item }: { item: HomeRadarItem | undefined }) {
  const typ = item?.typicalPrice ?? null;
  const max = item && typ ? Math.max(item.currentPrice, typ) : 0;
  return (
    <section aria-labelledby="radar-home" className="flex flex-col overflow-hidden rounded-3xl bg-vt-dark p-6 text-ink-foreground sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-mint-foreground"><BarChart3 className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="radar-home" className="text-2xl font-bold sm:text-3xl">Radar de preços</h2>
      </div>
      <p className="mt-3 max-w-md text-ink-foreground/80">Acompanhe o preço das bikes monitoradas e veja se o momento é bom para comprar.</p>
      {item && (
        <Link to="/acompanhamento/$bikeId" params={{ bikeId: item.id }} className="mt-6 grid grid-cols-[96px_minmax(0,1fr)] items-center gap-4 rounded-2xl bg-ink-foreground/5 p-4 ring-1 ring-ink-foreground/10 hover:ring-mint/60">
          <BikeMedia src={item.image} name={item.name} className="h-24 w-24 rounded-xl bg-background" />
          <div className="min-w-0">
            <p className="truncate font-bold">{item.name}</p>
            <div className="mt-1"><PriceStatus classification={item.classification} /></div>
            <div className="mt-3 space-y-1.5 text-sm">
              <PriceBar label="Atual" value={item.currentPrice} max={max || item.currentPrice} tone="bg-mint" />
              {typ !== null && <PriceBar label="Típico" value={typ} max={max} tone="bg-ink-foreground/40" />}
            </div>
          </div>
        </Link>
      )}
      <Link to="/acompanhamento" className="mt-6 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90">
        Ver Radar <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}

function PriceBar({ label, value, max, tone }: { label: string; value: number; max: number; tone: string }) {
  return (
    <div className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2">
      <span className="text-xs text-ink-foreground/70">{label}</span>
      <span className="h-2 overflow-hidden rounded-full bg-ink-foreground/10"><span className={`block h-full rounded-full ${tone}`} style={{ width: `${Math.round((value / max) * 100)}%` }} /></span>
      <span className="text-xs font-bold tabular-nums">{formatBRL(value)}</span>
    </div>
  );
}

function CalculatorPanel() {
  const modes = [
    { icon: Car, label: "Carro" },
    { icon: CarTaxiFront, label: "Uber" },
    { icon: Bus, label: "Ônibus" },
    { icon: Bike, label: "Bike elétrica" },
  ];
  return (
    <section aria-labelledby="calc" className="scroll-mt-24 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8">
      <div className="flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><Calculator className="h-6 w-6" aria-hidden="true" /></span>
        <h2 id="calc" className="text-2xl font-bold text-ink sm:text-3xl">Calculadora de economia</h2>
      </div>
      <p className="mt-3 max-w-md text-muted-foreground">Descubra quanto você pode economizar trocando carro, Uber, ônibus ou outros meios por uma bike elétrica.</p>
      <ul aria-label="Meios de transporte comparados" className="mt-6 grid grid-cols-4 gap-2 rounded-2xl bg-surface p-4">
        {modes.map(({ icon: Icon, label }, i) => (
          <li key={label} className="flex flex-col items-center gap-2 text-center">
            <span className={`grid h-12 w-12 place-items-center rounded-full ${i === 3 ? "bg-action text-primary-foreground" : "bg-card text-ink ring-1 ring-line"}`}><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <span className="text-xs font-semibold text-ink">{label}</span>
          </li>
        ))}
      </ul>
      <InactiveButton className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-action px-6 font-bold text-primary-foreground">
        Calcular minha economia <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </InactiveButton>
    </section>
  );
}

function CompareBlock({ cards }: { cards: HomeCard[] }) {
  const pair = cards.slice(0, 2);
  return (
    <section aria-labelledby="comparar" className="scroll-mt-24 rounded-3xl bg-surface p-6 sm:p-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><GitCompareArrows className="h-6 w-6" aria-hidden="true" /></span>
            <h2 id="comparar" className="text-2xl font-bold text-ink sm:text-3xl">Comparar bikes</h2>
          </div>
          <p className="mt-3 max-w-md text-muted-foreground">Coloque modelos lado a lado e veja as diferenças antes de decidir.</p>
          <InactiveButton className="mt-5 inline-flex min-h-12 items-center gap-2 rounded-xl bg-action px-6 font-bold text-primary-foreground">
            Comparar modelos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </InactiveButton>
        </div>
        {pair.length === 2 && (
          <div aria-hidden="true" className="relative grid grid-cols-2 gap-3">
            {pair.map((c) => (
              <div key={c.id} className="overflow-hidden rounded-2xl bg-card ring-1 ring-line">
                <BikeMedia src={c.image} name={c.name} className="aspect-[4/3] w-full" />
                <p className="truncate px-3 pb-3 text-center text-sm font-bold text-ink">{c.name}</p>
              </div>
            ))}
            <span className="absolute left-1/2 top-[38%] grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-ink text-sm font-black text-ink-foreground ring-4 ring-surface">VS</span>
          </div>
        )}
      </div>
    </section>
  );
}

function ContentBlock({ cards }: { cards: HomeCard[] }) {
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

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <main>
        <Hero />
        <Shortcuts />
        <BikesRow cards={cards} />
        <div className="responsive-container space-y-14 py-14">
          <div className="grid gap-5 lg:grid-cols-2">
            <RadarPanel item={radar[0]} />
            <CalculatorPanel />
          </div>
          <CompareBlock cards={cards} />
          <ContentBlock cards={cards} />
          <GroupAndNewsletter />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default HomeB2C;
