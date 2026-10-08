import { externalLinkProps } from "@/lib/external-link";
import { useState, type ReactNode } from "react";
import { bikeImageFallback } from "@/lib/bike-catalog";
import { useLoaderData, Link } from "@tanstack/react-router";
import { Bike, Menu, Youtube } from "lucide-react";
import { CLASSIFICATION_LABEL, type Classification } from "@/lib/price-tracker";
import { NewsletterSignup } from "@/components/site/NewsletterSignup";

import { SOCIAL_LINKS, YOUTUBE_SUBSCRIBE, YOUTUBE_CHANNEL } from "@/lib/social-links";

/*
 * Vitale Design System — peças compartilhadas por Home, Radar e detalhe.
 * Navegação só aponta para rotas reais. Comparação é um estado de /bikes (não há rota /comparar).
 */

export function Brand({ large = false }: { large?: boolean }) {
  return (
    <Link
      to="/"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-md border-2 border-logo-surface bg-logo-surface p-1 ${large ? "h-16 w-48 sm:h-20 sm:w-60" : "h-11 w-36 sm:h-14 sm:w-48"}`}
      aria-label="Vitale Mobilidade — início"
    >
      <img
        src="/vitale-logo-464.avif"
        alt="Vitale Mobilidade"
        width={464}
        height={152}
        decoding="async"
        className="h-full w-full object-contain"
      />
    </Link>
  );
}

type NavItem = { label: string; href?: string; to?: "/radar" | "/ferramentas" | "/conteudos" };
export const SITE_NAV: NavItem[] = [
  { label: "Radar de preços", to: "/radar" },
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
  return (
    <a href={item.href} {...externalLinkProps(item.href)} className={className}>
      {item.label}
    </a>
  );
}

/** Header único do site B2C. Sem busca superior (a busca vive dentro do Radar). */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-ink-foreground/10 bg-ink">
      <div className="responsive-container grid h-16 sm:h-18 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 py-3 lg:flex lg:justify-between">
        <Brand />
        <nav
          aria-label="Principal"
          className="hidden items-center gap-9 text-base font-semibold text-ink-foreground lg:flex"
        >
          {SITE_NAV.map((n) => (
            <NavLink
              key={n.label}
              item={n}
              className="relative py-2 transition-colors hover:text-mint after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:scale-x-0 after:bg-mint after:transition-transform hover:after:scale-x-100"
            />
          ))}
        </nav>
        <Link
          to="/quiz"
          reloadDocument
          className="hidden h-11 items-center rounded-xl bg-mint px-5 text-sm font-bold text-mint-foreground hover:opacity-90 lg:inline-flex"
        >
          Faça o Quiz e descubra a bike ideal
        </Link>
        <details className="relative lg:hidden">
          <summary className="flex h-11 cursor-pointer list-none items-center gap-2 rounded-xl border border-ink-foreground/25 px-4 text-sm font-semibold text-ink-foreground">
            <Menu className="h-5 w-5" aria-hidden="true" /> Menu
          </summary>
          <nav
            aria-label="Principal (celular)"
            className="absolute right-0 mt-2 w-72 space-y-1 rounded-2xl border border-border bg-popover p-3 text-popover-foreground shadow-xl"
          >
            {SITE_NAV.map((n) => (
              <NavLink key={n.label} item={n} className="block rounded-lg px-3 py-3 font-medium hover:bg-muted" />
            ))}
            <Link
              to="/quiz"
              reloadDocument
              className="mt-2 block rounded-lg bg-mint px-3 py-3 text-center font-bold text-mint-foreground"
            >
              Faça o Quiz e descubra a bike ideal
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

/** Footer B2C único (sem copy de consultoria). */
export function SiteFooter() {
  const { footerVideos } = useLoaderData({ from: "__root__" });
  const cols: {
    title: string;
    items: {
      label: string;
      href?: string;
      to?: "/quiz" | "/radar" | "/grupodeofertas" | "/ferramentas" | "/conteudos" | "/videos";
    }[];
  }[] = [
    { title: "Conteúdos e vídeos", items: [
      { label: "Artigos sobre bikes elétricas", to: "/conteudos" },
      { label: "Últimos vídeos do canal", to: "/videos" },
      { label: "Todos os vídeos no YouTube", href: `${YOUTUBE_CHANNEL}/videos` },
      { label: "Shorts da Vitale", href: `${YOUTUBE_CHANNEL}/shorts` },
      { label: "Playlists do canal", href: `${YOUTUBE_CHANNEL}/playlists` },
    ] },
    { title: "Bicicletas no Radar", items: [
      { label: "V9 Max", href: "/radar/v9_max" },
      { label: "BW02", href: "/radar/bw02" },
      { label: "Ouxi GT2000", href: "/radar/gt2000" },
      { label: "Ouxi GT20", href: "/radar/ouxi_gt20" },
      { label: "V20 Pro", href: "/radar/v20_pro" },
      { label: "S8", href: "/radar/s8" },
      { label: "FT03", href: "/radar/ft03" },
      { label: "V8 Pro", href: "/radar/v8_pro" },
      { label: "Ver todas as bikes e preços →", to: "/radar" },
    ] },
    { title: "Ferramentas para sua rotina", items: [
      { label: "Carro ou bike elétrica?", href: "/ferramentas/carro-vs-bike" },
      { label: "Moto ou bike elétrica?", href: "/ferramentas/moto-vs-bike" },
      { label: "Aplicativos ou bike?", href: "/ferramentas/aplicativos-vs-bike" },
      { label: "Transporte público ou bike?", href: "/ferramentas/transporte-publico-vs-bike" },
      { label: "Economia de tempo", href: "/ferramentas/economia-de-tempo" },
      { label: "Meta de entregas", href: "/ferramentas/meta-entregas" },
      { label: "Aluguel ou bike própria?", href: "/ferramentas/veiculo-alugado-vs-bike-propria" },
      { label: "Ver todas as ferramentas →", to: "/ferramentas" },
    ] },
    { title: "Faça parte da Vitale", items: [
      { label: "Inscreva-se no YouTube", href: YOUTUBE_SUBSCRIBE },
      { label: "Instagram", href: SOCIAL_LINKS[1].url },
      { label: "TikTok", href: SOCIAL_LINKS[2].url },
      { label: "Receba a newsletter", href: "#newsletter" },
      { label: "Grupo de ofertas", to: "/grupodeofertas" },
      { label: "Quiz: encontre sua bike", to: "/quiz" },
      { label: "Cookies e privacidade", href: "/privacidade" },
    ] },
  ];
  return (
    <>
      <aside aria-label="Cadastro da newsletter" className="bg-surface py-10 sm:py-14">
        <div className="responsive-container">
          <NewsletterSignup />
        </div>
      </aside>
      <section aria-labelledby="footer-youtube" className="bg-white py-10 sm:py-14">
        <div className="responsive-container">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="max-w-xl"><p className="flex items-center gap-2 text-sm font-bold text-red-700"><Youtube aria-hidden="true" /> VITALE NO YOUTUBE</p><h2 id="footer-youtube" className="mt-3 text-2xl font-bold text-ink">A conversa continua no canal</h2><p className="mt-2 text-muted-foreground">Testes na prática, comparativos e boas histórias sobre bikes elétricas. A Vitale Mobilidade é um canal no YouTube — e este é o nosso hub.</p></div>
            <a href={YOUTUBE_SUBSCRIBE} {...externalLinkProps(YOUTUBE_SUBSCRIBE)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-5 py-3 font-bold text-white hover:bg-red-800"><Youtube aria-hidden="true" /> Inscreva-se no YouTube</a>
          </div>
          {footerVideos.length > 0 && <div className="mt-7 grid gap-5 sm:grid-cols-3">{footerVideos.map((video) => <a key={video.videoId} href={video.url} {...externalLinkProps(video.url)} className="rounded-xl border border-line overflow-hidden hover:border-action"><img src={video.thumbnail} alt="" width={320} height={180} loading="lazy" decoding="async" className="aspect-video w-full object-cover" /><p className="p-4 text-sm font-semibold leading-relaxed text-ink">{video.title}</p></a>)}</div>}
          <a href="/videos" className="mt-5 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4">Ver todos os vídeos →</a>
        </div>
      </section>
      <footer className="bg-vt-dark text-ink-foreground/80">
        <div className="responsive-container grid gap-10 py-14 text-sm sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr_1fr]">
          <div>
            <Brand large />
            <p className="mt-4 max-w-xs leading-relaxed">
              Nosso canal no YouTube e nosso hub de conteúdo, ferramentas e preços para explorar a mobilidade elétrica.
            </p>
          <nav aria-label="Redes sociais" className="flex gap-4 mt-4 flex-wrap">{SOCIAL_LINKS.map((profile) => <a key={profile.label} href={profile.url} {...externalLinkProps(profile.url)} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:text-mint">{profile.label}</a>)}</nav>
            <Link
              to="/quiz"
              reloadDocument
              className="mt-5 inline-flex h-11 items-center rounded-xl bg-mint px-5 text-sm font-bold text-mint-foreground hover:opacity-90"
            >
              Escolher minha bike
            </Link>
          </div>
          {cols.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <details open className="group"><summary className="cursor-pointer py-2 font-bold text-ink-foreground">{c.title}</summary>
              <ul className="mt-3 space-y-2">
                {c.items.map((i) => (
                  <li key={i.label}>
                    {i.to ? (
                      <Link to={i.to} reloadDocument={i.to === "/quiz"} className="hover:text-mint">
                        {i.label}
                      </Link>
                    ) : (
                      <a href={i.href} {...externalLinkProps(i.href)} className="hover:text-mint">
                        {i.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul></details>
            </nav>
          ))}
        </div>
        <div className="border-t border-ink-foreground/10">
          <p className="responsive-container py-5 text-xs">
            © 2026 Vitale Mobilidade.
            <a href="/privacidade" className="ml-3 underline underline-offset-2 hover:text-mint">
              Cookies e privacidade
            </a>
          </p>
        </div>
      </footer>
    </>
  );
}

export function SectionHeading({
  id,
  title,
  sub,
  icon,
  action,
}: {
  id: string;
  title: string;
  sub?: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
      <div className="min-w-0 border-l-4 border-action pl-3">
        <h2 id={id} className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
          {icon}
          {title}
        </h2>
        {sub && <p className="mt-1 text-muted-foreground">{sub}</p>}
      </div>
      {action && <div className="shrink-0 text-sm font-semibold text-action">{action}</div>}
    </div>
  );
}

/** Imagem da bike protagonista (URL do catálogo); lazy por padrão, fallback sem imagem falsa. */
export function BikeMedia({
  src,
  fallbackSrc,
  name,
  className = "h-48",
  eager = false,
}: {
  src: string | null;
  fallbackSrc?: string | null;
  name: string;
  className?: string;
  eager?: boolean;
}) {
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const fallback = bikeImageFallback(name);
  const image =
    [src, fallbackSrc, fallback].find(
      (candidate): candidate is string => Boolean(candidate) && !failedSources.includes(candidate!),
    ) ?? null;
  return (
    <div className={`flex items-center justify-center overflow-hidden bg-surface ${className}`}>
      {image ? (
        <img
          src={image}
          onError={() => setFailedSources((failed) => [...failed, image])}
          alt={`Bike elétrica ${name}`}
          width={640}
          height={480}
          sizes="(max-width: 640px) 100vw, 320px"
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "low"}
          decoding="async"
          className="h-full w-full object-contain p-3"
        />
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
  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-3 py-1 text-xs font-bold ${STATUS_TONE[classification]}`}
    >
      {CLASSIFICATION_LABEL[classification]}
    </span>
  );
}

/** CTA sem backend: visível, claramente desativado e sem ação. */
export function DisabledCta({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" disabled aria-disabled="true" className={`cursor-not-allowed opacity-50 ${className}`}>
      {children}
    </button>
  );
}
