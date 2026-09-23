import { Link, useLoaderData } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, Menu, Search, ShieldCheck, Sparkles, Users } from "lucide-react";
import logo96 from "@/assets/logo-96.webp";
import logo192 from "@/assets/logo-192.webp";
import { formatBRL } from "@/lib/price-tracker";
import { RadarPreview } from "@/components/home/RadarPreview";
import { HomeSearch } from "@/components/home/HomeSearch";
import type { HomeSearchItem } from "@/lib/home-cards.functions";

/*
 * Comparador, calculadora, conteúdos/testes e newsletter ainda não têm backend/contrato
 * real: ficam fora da Home (sem links, sem "em breve") até estarem prontos.
 */

function Brand() {
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Vitale Mobilidade — início">
      <img src={logo96} srcSet={`${logo96} 1x, ${logo192} 2x`} alt="" width={40} height={40} decoding="async" className="h-10 w-10 shrink-0 rounded bg-background" />
      <span className="leading-none">
        <span className="block text-base font-extrabold tracking-tight text-ink-foreground">VITALE</span>
        <span className="block text-[11px] font-bold tracking-[0.2em] text-mint">MOBILIDADE</span>
      </span>
    </Link>
  );
}

const NAV = [
  { label: "Bikes", href: "#bikes" },
  { label: "Ferramentas", href: "#ferramentas" },
] as const;

function HomeHeader({ search }: { search: HomeSearchItem[] }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-foreground/10 bg-ink">
      <div className="responsive-container grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 lg:flex lg:justify-between">
        <Brand />
        <nav aria-label="Principal" className="hidden items-center gap-7 text-sm font-semibold text-ink-foreground lg:flex">
          {NAV.map((n) => (
            <a key={n.label} href={n.href} className="hover:text-mint">{n.label}</a>
          ))}
          <Link to="/escolherbike" className="hover:text-mint">Quiz</Link>
          <Link to="/acompanhamento" className="hover:text-mint">Radar</Link>
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <HomeSearch items={search} className="w-56" />
          <Link to="/grupodeofertas" className="inline-flex h-11 items-center rounded-xl bg-mint px-5 text-sm font-bold text-mint-foreground hover:opacity-90">
            Grupo de Ofertas
          </Link>
        </div>
        <details className="group relative lg:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-ink-foreground/25 px-4 text-sm font-semibold text-ink-foreground">
            <Menu className="h-5 w-5" aria-hidden="true" /> Menu
          </summary>
          <div className="absolute right-0 mt-2 w-72 space-y-1 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl">
            <HomeSearch items={search} className="mb-2" />
            {NAV.map((n) => (
              <a key={n.label} href={n.href} className="block rounded-lg px-3 py-2 font-medium hover:bg-muted">{n.label}</a>
            ))}
            <Link to="/escolherbike" className="block rounded-lg px-3 py-2 font-medium hover:bg-muted">Quiz: escolher minha bike</Link>
            <Link to="/acompanhamento" className="block rounded-lg px-3 py-2 font-medium hover:bg-muted">Radar de preços</Link>
            <Link to="/grupodeofertas" className="mt-2 block rounded-lg bg-mint px-3 py-2 text-center font-bold text-mint-foreground">Grupo de Ofertas</Link>
          </div>
        </details>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative isolate overflow-hidden bg-ink text-ink-foreground">
      <picture>
        <source media="(max-width: 767px)" srcSet="/vitale-hero-mobile.webp" width={480} height={728} />
        <source media="(max-width: 1400px)" srcSet="/vitale-hero-1280.webp" width={1280} height={720} />
        <img src="/vitale-hero.webp" width={1672} height={941} alt="Ciclista em bike elétrica na orla ao pôr do sol" fetchPriority="high" decoding="async" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/85 to-ink/20 max-md:bg-ink/70" aria-hidden="true" />
      <div className="responsive-container py-16 sm:py-24 lg:py-28">
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
          <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-mint" aria-hidden="true" /> Quiz de perfil</li>
          <li className="flex items-center gap-2"><BarChart3 className="h-4 w-4 text-mint" aria-hidden="true" /> Histórico de preços</li>
          <li className="flex items-center gap-2"><Bike className="h-4 w-4 text-mint" aria-hidden="true" /> Modelos monitorados</li>
        </ul>
      </div>
    </section>
  );
}

const SHORTCUTS = [
  { to: "/escolherbike", icon: Sparkles, title: "Escolher minha bike", sub: "Quiz de perfil" },
  { to: "/acompanhamento", icon: BarChart3, title: "Radar de preços", sub: "Acompanhe o histórico" },
  { to: "/grupodeofertas", icon: Users, title: "Grupo de ofertas", sub: "Avisos no WhatsApp" },
] as const;

function Shortcuts() {
  return (
    <nav aria-label="Atalhos" id="ferramentas" className="responsive-container relative z-10 -mt-8 scroll-mt-24">
      <ul className="grid gap-2 rounded-2xl border border-border bg-card p-3 shadow-lg sm:grid-cols-3">
        {SHORTCUTS.map(({ to, icon: Icon, title, sub }) => (
          <li key={to}>
            <Link to={to} className="flex items-center gap-3 rounded-xl p-3 hover:bg-muted">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint/25 text-primary"><Icon className="h-5 w-5" aria-hidden="true" /></span>
              <span className="min-w-0"><span className="block font-bold">{title}</span><span className="block text-sm text-muted-foreground">{sub}</span></span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function HomeFooter() {
  return (
    <footer className="bg-ink text-ink-foreground/80">
      <div className="responsive-container flex flex-col gap-6 py-10 text-sm sm:flex-row sm:items-center sm:justify-between">
        <Brand />
        <nav aria-label="Rodapé" className="flex flex-wrap gap-5">
          <Link to="/escolherbike" className="hover:text-mint">Escolher minha bike</Link>
          <Link to="/acompanhamento" className="hover:text-mint">Radar de preços</Link>
          <Link to="/grupodeofertas" className="hover:text-mint">Grupo de ofertas</Link>
        </nav>
        <p>© 2026 Vitale Mobilidade</p>
      </div>
    </footer>
  );
}

const HomeB2C = () => {
  const data = useLoaderData({ from: "/" });
  const ok = data?.ok === true;
  const cards = ok ? data.cards : [];
  const search = ok ? data.search : [];
  const radar = ok ? data.radar : [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HomeHeader search={search} />
      <main>
        <Hero />
        <Shortcuts />

        <div className="responsive-container grid gap-8 py-12 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
          {/* No mobile o Radar vem antes das bikes (ordem do DOM); no desktop fica à direita. */}
          <RadarPreview items={radar} className="lg:order-2 lg:sticky lg:top-24" />

          {cards.length > 0 ? (
            <section id="bikes" aria-labelledby="bikes-monitoradas" className="scroll-mt-24 lg:order-1">
              <div className="flex items-end justify-between gap-3">
                <h2 id="bikes-monitoradas" className="text-2xl font-bold">Bikes com preço monitorado</h2>
                <Link to="/acompanhamento" className="shrink-0 text-sm font-semibold text-primary hover:underline">Ver todas</Link>
              </div>
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {cards.map((e) => (
                  <li key={e.id}>
                    <Link to="/acompanhamento/$bikeId" params={{ bikeId: e.id }} className="block h-full rounded-2xl border border-border bg-card p-5 transition-shadow hover:border-primary hover:shadow-md">
                      <h3 className="font-semibold">{e.name}</h3>
                      <p className="mt-3 text-xs text-muted-foreground">Preço atual registrado</p>
                      <p className="text-2xl font-bold text-primary">{formatBRL(e.currentPrice)}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Ver histórico <ArrowRight className="h-4 w-4" aria-hidden="true" /></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <section id="bikes" className="scroll-mt-24 rounded-2xl border border-border p-6 lg:order-1">
              <h2 className="text-xl font-bold">Bikes monitoradas</h2>
              <p className="mt-2 text-muted-foreground">Veja todas as bikes acompanhadas no Radar de preços.</p>
              <Link to="/acompanhamento" className="mt-4 inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <Search className="h-4 w-4" aria-hidden="true" /> Abrir o Radar
              </Link>
            </section>
          )}
        </div>

        <section className="responsive-container pb-14" aria-labelledby="quiz-cta">
          <div className="grid gap-6 rounded-3xl border border-border bg-muted p-6 sm:p-10 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h2 id="quiz-cta" className="text-2xl font-bold">Não sabe por onde começar?</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">Responda 7 perguntas sobre uso, trajeto e orçamento e veja os modelos indicados para o seu perfil.</p>
            </div>
            <Link to="/escolherbike" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90">
              Fazer o quiz <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>

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
      </main>
      <HomeFooter />
    </div>
  );
};

export default HomeB2C;
