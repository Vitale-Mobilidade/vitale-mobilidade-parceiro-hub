import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, Bike, BookOpen, Menu, MessageCircle } from "lucide-react";
import logo96 from "@/assets/logo-96.webp";
import logo192 from "@/assets/logo-192.webp";
import { CLASSIFICATION_LABEL, type Classification } from "@/lib/price-tracker";

/*
 * Vitale Design System — peças compartilhadas por Home, Radar e detalhe.
 * Navegação só aponta para rotas reais. Comparação é uma função do Radar (não há rota /comparar).
 */

export function Brand({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const name = tone === "dark" ? "text-ink-foreground" : "text-ink";
  const sub = tone === "dark" ? "text-mint" : "text-action";
  return (
    <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Vitale Mobilidade — início">
      <img src={logo96} srcSet={`${logo96} 1x, ${logo192} 2x`} alt="" width={64} height={64} decoding="async" className="h-16 w-16 shrink-0 rounded-xl bg-background shadow-sm" />
      <span className="leading-none">
        <span className={`block text-[1.35rem] font-black tracking-tight ${name}`}>VITALE</span>
        <span className={`mt-1 block text-[11px] font-bold tracking-[0.3em] ${sub}`}>MOBILIDADE</span>
      </span>
    </Link>
  );
}

type NavItem = { label: string; href?: string; to?: "/radar" | "/ferramentas" | "/conteudos" };
export const SITE_NAV: NavItem[] = [
  { label: "Radar", to: "/radar" },
  { label: "Conteúdos", to: "/conteudos" },
  { label: "Ferramentas", to: "/ferramentas" },
];

function NavLink({ item, className }: { item: NavItem; className: string }) {
  if (item.to) {
    return (
      <Link to={item.to} className={className} activeProps={{ "aria-current": "page", className: "text-mint" }}>
        {item.label}
      </Link>
    );
  }
  return <a href={item.href} className={className}>{item.label}</a>;
}

/** Header único do site B2C. Sem busca superior (a busca vive dentro do Radar). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-foreground/10 bg-vt-dark/95 shadow-[0_8px_30px_rgba(0,0,0,0.08)] backdrop-blur-xl">
      <div className="responsive-container grid min-h-20 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-2 lg:grid-cols-[1fr_auto_1fr]">
        <Brand />
        <nav aria-label="Principal" className="hidden items-center gap-1 rounded-full border border-ink-foreground/10 bg-ink-foreground/[0.04] p-1.5 text-[15px] font-semibold text-ink-foreground lg:flex">
          {SITE_NAV.map((n) => <NavLink key={n.label} item={n} className="rounded-full px-5 py-2.5 transition-colors hover:bg-ink-foreground/10 hover:text-mint" />)}
        </nav>
        <Link to="/escolherbike" className="hidden h-12 items-center justify-self-end rounded-full bg-mint px-6 text-sm font-black text-mint-foreground shadow-[0_8px_24px_rgba(57,230,163,0.18)] transition hover:-translate-y-0.5 hover:brightness-105 lg:inline-flex">
          Escolher minha bike <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
        </Link>
        <details className="relative lg:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-full border border-ink-foreground/25 bg-ink-foreground/5 px-4 text-sm font-semibold text-ink-foreground">
            <Menu className="h-5 w-5" aria-hidden="true" /> Menu
          </summary>
          <nav aria-label="Principal (celular)" className="absolute right-0 mt-3 w-[min(21rem,calc(100vw-2rem))] space-y-1 rounded-3xl border border-line bg-card p-3 text-card-foreground shadow-2xl">
            {SITE_NAV.map((n) => <NavLink key={n.label} item={n} className="block rounded-xl px-4 py-3.5 font-bold hover:bg-surface" />)}
            <Link to="/escolherbike" className="mt-2 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 text-center font-black text-mint-foreground">Escolher minha bike <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

/** Footer B2C único (sem copy de consultoria). */
export function SiteFooter() {
  const cols: { title: string; icon: ReactNode; items: { label: string; href?: string; to?: "/escolherbike" | "/radar" | "/grupodeofertas" | "/ferramentas" | "/conteudos"; disabled?: boolean }[] }[] = [
    { title: "Decidir", icon: <BarChart3 className="h-4 w-4" aria-hidden="true" />, items: [
      { label: "Radar de preços", to: "/radar" },
      { label: "Comparar bikes", href: "/radar#comparar" },
      { label: "Escolher minha bike", to: "/escolherbike" },
    ] },
    { title: "Aprender", icon: <BookOpen className="h-4 w-4" aria-hidden="true" />, items: [
      { label: "Todas as ferramentas", to: "/ferramentas" },
      { label: "Conteúdos e testes", to: "/conteudos" },
    ] },
    { title: "Comunidade", icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />, items: [{ label: "Grupo de ofertas", to: "/grupodeofertas" }, { label: "Newsletter", disabled: true }] },
  ];
  return (
    <footer className="relative overflow-hidden bg-vt-dark text-ink-foreground/75">
      <div aria-hidden="true" className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-mint/[0.07] blur-3xl" />
      <div className="responsive-container relative border-b border-ink-foreground/10 py-10 sm:py-12">
        <div className="flex flex-col gap-6 rounded-3xl border border-ink-foreground/10 bg-ink-foreground/[0.04] p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-mint">Seu próximo passo</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-black tracking-tight text-ink-foreground sm:text-3xl">Ainda não sabe qual bike faz sentido para você?</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed sm:text-base">Responda algumas perguntas sobre seu uso, trajeto e orçamento e comece a decisão pelo lugar certo.</p>
          </div>
          <Link to="/escolherbike" className="inline-flex min-h-14 shrink-0 items-center justify-center gap-2 rounded-full bg-mint px-7 font-black text-mint-foreground transition hover:-translate-y-0.5 hover:brightness-105">Descobrir minha bike <ArrowRight className="h-5 w-5" aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="responsive-container relative grid gap-10 py-12 text-sm sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr] lg:gap-14">
        <div>
          <Brand />
          <p className="mt-5 max-w-sm text-base leading-relaxed">Dados, testes e ferramentas para transformar dúvida em uma escolha mais segura.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-ink-foreground/70">
            <span className="rounded-full border border-ink-foreground/15 px-3 py-1.5">Preços reais</span>
            <span className="rounded-full border border-ink-foreground/15 px-3 py-1.5">Testes da Vitale</span>
            <span className="rounded-full border border-ink-foreground/15 px-3 py-1.5">Ferramentas gratuitas</span>
          </div>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="flex items-center gap-2 font-black text-ink-foreground">{c.icon}{c.title}</p>
            <ul className="mt-4 space-y-3">
              {c.items.map((i) => (
                <li key={i.label}>
                  {i.disabled ? <span aria-disabled="true" className="text-ink-foreground/45">{i.label} <span className="ml-1 rounded-full bg-ink-foreground/10 px-2 py-0.5 text-[9px] uppercase tracking-wide">em breve</span></span> : i.to ? <Link to={i.to} className="inline-flex items-center gap-1.5 transition hover:translate-x-0.5 hover:text-mint">{i.label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link> : <a href={i.href} className="inline-flex items-center gap-1.5 transition hover:translate-x-0.5 hover:text-mint">{i.label}<ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></a>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink-foreground/10">
        <div className="responsive-container flex flex-col gap-2 py-5 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Vitale Mobilidade.</p>
          <p>Algumas páginas usam links de afiliado do Mercado Livre, sempre com destino direto.</p>
        </div>
      </div>
    </footer>
  );
}

export function SectionHeading({ id, title, sub, icon, action }: { id: string; title: string; sub?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0 border-l-4 border-action pl-3">
        <h2 id={id} className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">{icon}{title}</h2>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="shrink-0 text-sm font-semibold text-action">{action}</div>}
    </div>
  );
}

/** Imagem da bike protagonista (URL do catálogo); lazy por padrão, fallback sem imagem falsa. */
export function BikeMedia({ src, name, className = "h-48", eager = false }: { src: string | null; name: string; className?: string; eager?: boolean }) {
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-surface ${className}`}>
      {src ? (
        <img src={src} alt={`Bike elétrica ${name}`} loading={eager ? "eager" : "lazy"} decoding="async" className="h-full w-full object-contain p-3" />
      ) : (
        <Bike className="h-12 w-12 text-action/40" aria-label="Imagem indisponível" />
      )}
    </div>
  );
}

const STATUS_TONE: Record<Classification, string> = {
  forming: "bg-muted text-muted-foreground",
  lowest: "bg-action text-primary-foreground",
  good: "bg-mint/30 text-ink",
  typical: "bg-surface text-ink border border-line",
  above: "bg-destructive/10 text-destructive",
};

/** Selo da classificação JÁ calculada pelo Radar (não recalcula nada). */
export function PriceStatus({ classification }: { classification: Classification }) {
  return <span className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[classification]}`}>{CLASSIFICATION_LABEL[classification]}</span>;
}

/** CTA sem backend: visível, claramente desativado e sem ação. */
export function DisabledCta({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" disabled aria-disabled="true" className={`cursor-not-allowed opacity-50 ${className}`}>
      {children}
    </button>
  );
}
