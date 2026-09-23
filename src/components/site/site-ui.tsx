import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Bike, Menu } from "lucide-react";
import logo96 from "@/assets/logo-96.webp";
import logo192 from "@/assets/logo-192.webp";
import { CLASSIFICATION_LABEL, type Classification } from "@/lib/price-tracker";

/*
 * Vitale Design System — peças compartilhadas por Home, Radar e detalhe.
 * Destinos futuros (Comparar, Conteúdos, Ferramentas) apontam para seções reais da Home
 * (âncoras honestas), nunca para rotas inexistentes.
 */

export function Brand({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const name = tone === "dark" ? "text-ink-foreground" : "text-ink";
  const sub = tone === "dark" ? "text-mint" : "text-action";
  return (
    <Link to="/" className="flex min-w-0 items-center gap-2" aria-label="Vitale Mobilidade — início">
      <img src={logo96} srcSet={`${logo96} 1x, ${logo192} 2x`} alt="" width={48} height={48} decoding="async" className="h-12 w-12 shrink-0 rounded bg-background" />
      <span className="leading-none">
        <span className={`block text-xl font-black tracking-tight ${name}`}>VITALE</span>
        <span className={`block text-[11px] font-bold tracking-[0.28em] ${sub}`}>MOBILIDADE</span>
      </span>
    </Link>
  );
}

type NavItem = { label: string; href?: string; to?: "/radar" | "/bikes" | "/ferramentas" };
export const SITE_NAV: NavItem[] = [
  { label: "Bikes", to: "/bikes" },
  { label: "Comparar", href: "/#comparar" },
  { label: "Conteúdos", href: "/#conteudos" },
  { label: "Ferramentas", to: "/ferramentas" },
  { label: "Radar", to: "/radar" },
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
    <header className="sticky top-0 z-40 border-b border-ink-foreground/10 bg-ink">
      <div className="responsive-container grid h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 lg:flex lg:justify-between">
        <Brand />
        <nav aria-label="Principal" className="hidden items-center gap-9 text-base font-semibold text-ink-foreground lg:flex">
          {SITE_NAV.map((n) => <NavLink key={n.label} item={n} className="relative py-2 transition-colors hover:text-mint after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:scale-x-0 after:bg-mint after:transition-transform hover:after:scale-x-100" />)}
        </nav>
        <Link to="/grupodeofertas" className="hidden h-11 items-center rounded-xl bg-mint px-5 text-sm font-bold text-mint-foreground hover:opacity-90 lg:inline-flex">
          Grupo de Ofertas
        </Link>
        <details className="relative lg:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-ink-foreground/25 px-4 text-sm font-semibold text-ink-foreground">
            <Menu className="h-5 w-5" aria-hidden="true" /> Menu
          </summary>
          <nav aria-label="Principal (celular)" className="absolute right-0 mt-2 w-72 space-y-1 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl">
            {SITE_NAV.map((n) => <NavLink key={n.label} item={n} className="block rounded-lg px-3 py-3 font-medium hover:bg-muted" />)}
            <Link to="/grupodeofertas" className="mt-2 block rounded-lg bg-mint px-3 py-3 text-center font-bold text-mint-foreground">Grupo de Ofertas</Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

/** Footer B2C único (sem copy de consultoria). */
export function SiteFooter() {
  const cols: { title: string; items: { label: string; href?: string; to?: "/escolherbike" | "/radar" | "/grupodeofertas" | "/bikes" }[] }[] = [
    { title: "Explorar", items: [
      { label: "Bikes", to: "/bikes" },
      { label: "Escolher minha bike", to: "/escolherbike" },
      { label: "Radar de preços", to: "/radar" },
    ] },
    { title: "Ferramentas", items: [
      { label: "Comparar bikes", href: "/#comparar" },
      { label: "Calculadora de economia", href: "/#calc" },
      { label: "Conteúdos e testes", href: "/#conteudos" },
    ] },
    { title: "Comunidade", items: [{ label: "Grupo de ofertas", to: "/grupodeofertas" }, { label: "Quiz de perfil", to: "/escolherbike" }] },
  ];
  return (
    <footer className="bg-vt-dark text-ink-foreground/80">
      <div className="responsive-container grid gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div>
          <Brand />
          <p className="mt-4 max-w-xs leading-relaxed">Ferramentas e informação para escolher sua bike elétrica no Brasil.</p>
          <Link to="/escolherbike" className="mt-5 inline-flex h-11 items-center rounded-xl bg-mint px-5 text-sm font-bold text-mint-foreground hover:opacity-90">Escolher minha bike</Link>
        </div>
        {cols.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <p className="font-bold text-ink-foreground">{c.title}</p>
            <ul className="mt-3 space-y-2">
              {c.items.map((i) => (
                <li key={i.label}>
                  {i.to ? <Link to={i.to} className="hover:text-mint">{i.label}</Link> : <a href={i.href} className="hover:text-mint">{i.label}</a>}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>
      <div className="border-t border-ink-foreground/10">
        <p className="responsive-container py-5 text-xs">© 2026 Vitale Mobilidade. Usamos links de afiliado do Mercado Livre em algumas páginas.</p>
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
