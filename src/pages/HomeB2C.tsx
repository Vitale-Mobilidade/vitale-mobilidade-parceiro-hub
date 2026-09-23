import { Link, useLoaderData } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, Calculator, GitCompareArrows, Mail, PlayCircle, Search, ShieldCheck, Users, Youtube } from "lucide-react";
import { formatBRL } from "@/lib/price-tracker";
import { RadarPreview } from "@/components/home/RadarPreview";
import { SiteHeader, SiteFooter, BikeMedia, SectionHeading } from "@/components/site/site-ui";
import { HOME_PRODUCTS, ProductLink, InactiveButton } from "@/components/home/home-products";

/*
 * Comparador, calculadora, conteúdos e newsletter aparecem na arquitetura visual, mas
 * seus CTAs são inativos (aria-disabled, sem href/submit) até as rotas existirem.
 * Nenhum email é coletado. Ligue-os preenchendo `to` em home-products.tsx.
 */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      <picture>
        <source media="(max-width: 767px)" srcSet="/vitale-hero-mobile.webp" width={480} height={728} />
        <source media="(max-width: 1400px)" srcSet="/vitale-hero-1280.webp" width={1280} height={720} />
        <img src="/vitale-hero.webp" width={1672} height={941} alt="Ciclista em bike elétrica na orla ao pôr do sol" fetchPriority="high" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/20 max-md:bg-ink/70" aria-hidden="true" />
      <div className="responsive-container pb-24 pt-16 sm:pb-28 sm:pt-24">
        <p className="text-xs font-bold tracking-[0.25em] text-mint">BIKES ELÉTRICAS NO BRASIL</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
          Encontre a bike elétrica <span className="text-mint">certa para você</span>
        </h1>
        <p className="mt-6 max-w-xl text-base text-ink-foreground/90 sm:text-lg">
          Testamos bikes, comparamos modelos, acompanhamos preços e criamos ferramentas para ajudar você a escolher.
        </p>
        <div className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Link to="/escolherbike" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90">
            <Bike className="h-5 w-5" aria-hidden="true" /> Escolher minha bike <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link to="/acompanhamento" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl border border-mint/60 px-6 font-bold hover:bg-ink-foreground/10">
            Ver Radar de preços <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <ul className="mt-10 flex max-w-2xl flex-wrap gap-x-6 gap-y-2 border-t border-ink-foreground/15 pt-6 text-sm">
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-mint" aria-hidden="true" /> Testes e análises</li>
          <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-mint" aria-hidden="true" /> Histórico de preços</li>
          <li className="flex items-center gap-2"><Bike className="h-4 w-4 text-mint" aria-hidden="true" /> Modelos monitorados</li>
        </ul>
      </div>
    </section>
  );
}

function Shortcuts() {
  return (
    <nav aria-label="Produtos" className="responsive-container relative z-10 -mt-12">
      <ul className="grid gap-1 rounded-2xl border border-border bg-card p-3 shadow-lg sm:grid-cols-2 lg:grid-cols-5">
        {HOME_PRODUCTS.map(({ key, to, icon: Icon, title, sub }) => (
          <li key={key}>
            <ProductLink to={to} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint/25 text-action"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block font-bold">{title}</span><span className="block text-sm text-muted-foreground">{sub}</span></span>
            </ProductLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function CalculatorBlock() {
  return (
    <section aria-labelledby="calc" className="overflow-hidden rounded-3xl bg-ink p-6 text-ink-foreground sm:p-10">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-mint-foreground"><Calculator className="h-6 w-6" aria-hidden="true" /></span>
          <h2 id="calc" className="mt-5 text-2xl font-bold sm:text-3xl">Calculadora de economia</h2>
          <p className="mt-3 max-w-md text-ink-foreground/80">Descubra quanto você pode economizar trocando carro, Uber, ônibus ou outros meios por uma bike elétrica.</p>
          <InactiveButton className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground">
            Calcular minha economia <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </InactiveButton>
        </div>
        <div aria-hidden="true" className="grid gap-3 rounded-2xl border border-ink-foreground/15 bg-ink-foreground/5 p-5">
          {["Distância por dia", "Dias de uso por semana", "Valor da bike"].map((l) => (
            <div key={l}>
              <p className="text-xs font-semibold uppercase tracking-wider text-ink-foreground/70">{l}</p>
              <div className="mt-1 h-11 rounded-lg border border-ink-foreground/20 bg-ink" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CompareBlock({ names }: { names: string[] }) {
  const [a, b] = names;
  return (
    <section aria-labelledby="comparar" className="rounded-3xl border border-border bg-card p-6 sm:p-10">
      <div className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] md:items-center">
        <div>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action"><GitCompareArrows className="h-6 w-6" aria-hidden="true" /></span>
          <h2 id="comparar" className="mt-5 text-2xl font-bold sm:text-3xl">Comparar bikes</h2>
          <p className="mt-3 max-w-md text-muted-foreground">Coloque modelos lado a lado e veja as diferenças antes de decidir.</p>
          <InactiveButton className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-xl bg-primary px-6 font-bold text-action-foreground">
            Comparar modelos <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </InactiveButton>
        </div>
        <div aria-hidden="true" className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {[a, b].map((n, i) => (
            <div key={i} className={`rounded-2xl border border-border bg-muted p-5 text-center ${i === 1 ? "col-start-3" : ""}`}>
              <Bike className="mx-auto h-8 w-8 text-action" />
              <p className="mt-3 truncate font-semibold">{n ?? "Bike"}</p>
            </div>
          ))}
          <span className="col-start-2 row-start-1 grid h-10 w-10 place-items-center rounded-full bg-ink text-sm font-bold text-ink-foreground">VS</span>
        </div>
      </div>
    </section>
  );
}

function ContentBlock() {
  const cats = ["Testes", "Comparativos", "Guias de compra"];
  return (
    <section aria-labelledby="conteudos">
      <div className="flex items-end justify-between gap-3">
        <h2 id="conteudos" className="flex items-center gap-2 text-2xl font-bold"><Youtube className="h-6 w-6 text-action" aria-hidden="true" /> Conteúdos e testes</h2>
        <InactiveButton className="shrink-0 text-sm font-semibold text-action">Ver no YouTube</InactiveButton>
      </div>
      <p className="mt-2 text-muted-foreground">Análises em vídeo e texto para ajudar na escolha.</p>
      <ul className="mt-5 grid gap-4 sm:grid-cols-3">
        {cats.map((c) => (
          <li key={c} className="overflow-hidden rounded-2xl border border-border bg-card">
            <div className="grid aspect-video place-items-center bg-ink" aria-hidden="true">
              <PlayCircle className="h-12 w-12 text-mint" />
            </div>
            <p className="p-4 font-semibold">{c}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Newsletter() {
  return (
    <section aria-labelledby="newsletter" className="rounded-3xl border border-border bg-muted p-6 sm:p-10">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
        <div>
          <h2 id="newsletter" className="flex items-center gap-2 text-2xl font-bold"><Mail className="h-6 w-6 text-action" aria-hidden="true" /> Newsletter Vitale</h2>
          <p className="mt-2 text-muted-foreground">Novidades sobre bikes elétricas, preços e ferramentas no seu email.</p>
        </div>
        {/* Sem <form>, sem name, sem submit: nenhum dado é coletado. */}
        <div className="flex flex-col gap-3 sm:flex-row">
          <label htmlFor="nl-email" className="sr-only">Seu email</label>
          <input id="nl-email" type="email" disabled aria-disabled="true" placeholder="seu@email.com" className="h-12 min-w-0 flex-1 rounded-xl border border-input bg-background px-4 text-sm" />
          <InactiveButton className="h-12 rounded-xl bg-primary px-6 font-bold text-action-foreground">Quero receber</InactiveButton>
        </div>
      </div>
    </section>
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

        <div className="responsive-container grid gap-8 py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          {/* Mobile: Radar antes das bikes (ordem do DOM); desktop: à direita. */}
          <RadarPreview items={radar} className="lg:order-2 lg:sticky lg:top-24" />
          {cards.length > 0 ? (
            <section id="bikes" aria-labelledby="bikes-monitoradas" className="scroll-mt-24 lg:order-1">
              <SectionHeading id="bikes-monitoradas" title="Bikes com preço monitorado" sub="Preço atual registrado pelo Radar da Vitale." action={<Link to="/acompanhamento" className="hover:underline">Ver todas</Link>} />
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {cards.map((e) => (
                  <li key={e.id}>
                    <Link to="/acompanhamento/$bikeId" params={{ bikeId: e.id }} className="block h-full overflow-hidden rounded-2xl border border-line bg-card transition-shadow hover:border-action hover:shadow-md">
                      <BikeMedia src={e.image} name={e.name} className="h-44" />
                      <div className="p-5">
                      <h3 className="font-semibold">{e.name}</h3>
                      <p className="mt-3 text-xs text-muted-foreground">Preço atual registrado</p>
                      <p className="text-2xl font-bold text-action">{formatBRL(e.currentPrice)}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-action">Ver histórico <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section id="bikes" className="scroll-mt-24 rounded-2xl border border-border p-6 lg:order-1">
              <h2 className="text-xl font-bold">Bikes monitoradas</h2>
              <p className="mt-2 text-muted-foreground">Veja todas as bikes acompanhadas no Radar de preços.</p>
              <Link to="/acompanhamento" className="mt-4 inline-flex items-center gap-1 font-semibold text-action hover:underline">
                <Search className="h-4 w-4" aria-hidden="true" /> Abrir o Radar
              </Link>
            </section>
          )}
        </div>

        <div className="responsive-container space-y-12 pb-14">
          <CalculatorBlock />
          <CompareBlock names={cards.map((c) => c.name)} />
          <ContentBlock />
        </div>

        <section className="bg-ink py-14 text-ink-foreground" aria-labelledby="grupo-ofertas">
          <div className="responsive-container grid gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h2 id="grupo-ofertas" className="text-2xl font-bold">Grupo de ofertas no WhatsApp</h2>
              <p className="mt-2 max-w-xl text-ink-foreground/80">Grupo somente de avisos: a Vitale compartilha ofertas de bikes elétricas e você acompanha sem conversas paralelas.</p>
            </div>
            <Link to="/grupodeofertas" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-mint px-6 font-bold text-mint-foreground hover:opacity-90">
              <Users className="h-5 w-5" aria-hidden="true" /> Entrar no grupo
            </Link>
          </div>
        </section>

        <div className="responsive-container py-14">
          <Newsletter />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default HomeB2C;
