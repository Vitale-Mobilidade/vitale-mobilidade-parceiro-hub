import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLoaderData } from "@tanstack/react-router";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Pause,
  Play,
  BarChart3,
  Bike,
  Bus,
  Calculator,
  Car,
  CarTaxiFront,
} from "lucide-react";
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
        <img
          src="/vitale-hero-v2.webp"
          width={1672}
          height={941}
          alt="Ciclista em bike elétrica na orla da cidade ao pôr do sol"
          fetchPriority="high"
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center]"
        />
      </picture>
      <div
        className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/75 to-transparent max-md:bg-gradient-to-t max-md:from-ink max-md:via-ink/70 max-md:to-ink/20"
        aria-hidden="true"
      />
      <div className="responsive-container entry-hero-inner">
        <h1 className="entry-h1">
          Encontre a bike elétrica <span className="text-mint">certa para você</span>
        </h1>
        <p className="entry-lead max-w-xl">
          Testamos bikes, comparamos modelos, acompanhamos preços e criamos ferramentas para ajudar você a escolher.
        </p>
        <div className="mt-9 flex max-w-xl flex-col gap-3 sm:flex-row">
          <Link
            to="/escolherbike"
            reloadDocument
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl bg-mint px-7 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90"
          >
            <Bike className="h-5 w-5 shrink-0" aria-hidden="true" />{" "}
            <span className="sm:hidden">Faça o quiz e descubra a bike ideal</span>
            <span className="hidden sm:inline">Escolher minha bike</span>{" "}
            <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
          </Link>
          <Link
            to="/radar"
            className="inline-flex min-h-14 items-center justify-center gap-2 rounded-xl border-2 border-mint/70 bg-ink/40 px-7 text-lg font-bold backdrop-blur-sm hover:bg-ink-foreground/10"
          >
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
          <li
            key={key}
            className={
              i === 4
                ? "col-span-2 border-t border-line md:col-span-1 md:border-t-0"
                : i < 4
                  ? "border-line max-md:border-b max-md:odd:border-r"
                  : ""
            }
          >
            <ProductLink
              to={to}
              className="flex h-full items-center gap-3 p-4 transition-colors hover:bg-surface md:p-5"
            >
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/25 text-action">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold leading-tight text-ink md:text-[15px]">{title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{sub}</span>
              </span>
            </ProductLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** All cards render in SSR; phones add swipe, arrows and optional automatic rotation. */
function MobileCards({ children, label, desktopGrid }: { children: ReactNode[]; label: string; desktopGrid: string }) {
  const list = useRef<HTMLUListElement>(null);
  const visible = useRef(false);
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const activeRef = useRef(0);
  const count = children.length;
  function move(index: number) {
    const root = list.current;
    const item = root?.children[index] as HTMLElement | undefined;
    const first = root?.children[0] as HTMLElement | undefined;
    if (root && item && first)
      root.scrollTo({ left: item.offsetLeft - first.offsetLeft, behavior: reduced ? "auto" : "smooth" });
  }
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(motion.matches);
    update();
    motion.addEventListener("change", update);
    const observer = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.isIntersecting;
      },
      { threshold: 0.5 },
    );
    if (list.current) observer.observe(list.current);
    return () => {
      motion.removeEventListener("change", update);
      observer.disconnect();
    };
  }, []);
  useEffect(() => {
    if (paused || reduced || count < 2) return;
    const timer = window.setInterval(() => {
      const root = list.current;
      if (
        !root ||
        !visible.current ||
        document.visibilityState !== "visible" ||
        !window.matchMedia("(max-width: 639px)").matches ||
        root.contains(document.activeElement)
      )
        return;
      const index = (activeRef.current + 1) % count;
      const item = root.children[index] as HTMLElement;
      const first = root.children[0] as HTMLElement;
      root.scrollTo({ left: item.offsetLeft - first.offsetLeft, behavior: "smooth" });
    }, 6000);
    return () => window.clearInterval(timer);
  }, [count, paused, reduced]);
  return (
    <div role="region" aria-label={label} className="min-w-0">
      <ul
        ref={list}
        className={`relative mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain pb-2 sm:grid sm:overflow-visible ${desktopGrid}`}
        onPointerDown={() => setPaused(true)}
        onFocusCapture={() => setPaused(true)}
        onScroll={() => {
          const root = list.current;
          if (!root) return;
          const first = root.children[0] as HTMLElement;
          let nearest = 0;
          let distance = Infinity;
          Array.from(root.children).forEach((item, index) => {
            const gap = Math.abs((item as HTMLElement).offsetLeft - first.offsetLeft - root.scrollLeft);
            if (gap < distance) {
              nearest = index;
              distance = gap;
            }
          });
          activeRef.current = nearest;
          setActive(nearest);
        }}
      >
        {children}
      </ul>
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3 sm:hidden">
          <button
            type="button"
            aria-label={`Anterior em ${label}`}
            className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-action"
            onClick={() => {
              setPaused(true);
              move((active + count - 1) % count);
            }}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <span className="min-w-12 text-center text-sm text-muted-foreground">
            {active + 1} / {count}
          </span>
          <button
            type="button"
            aria-label={`Próximo em ${label}`}
            className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-action"
            onClick={() => {
              setPaused(true);
              move((active + 1) % count);
            }}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
          {!reduced && (
            <button
              type="button"
              aria-label={paused ? "Retomar passagem automática" : "Pausar passagem automática"}
              className="grid h-11 w-11 place-items-center rounded-full border border-line bg-card text-action"
              onClick={() => setPaused((value) => !value)}
            >
              {paused ? (
                <Play className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Pause className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BikesRow({ cards }: { cards: HomeCard[] }) {
  if (cards.length === 0) {
    return (
      <section id="bikes" className="responsive-container scroll-mt-24 pt-14">
        <SectionHeading
          id="bikes-monitoradas"
          title="Bikes monitoradas"
          sub="Veja todas as bikes acompanhadas no Radar de preços."
          action={
            <Link to="/radar" className="hover:underline">
              Abrir o Radar de preços
            </Link>
          }
        />
      </section>
    );
  }
  return (
    <section id="bikes" aria-labelledby="bikes-monitoradas" className="responsive-container scroll-mt-24 pt-14">
      <SectionHeading
        id="bikes-monitoradas"
        title="Bikes em destaque"
        sub="Preço atual registrado pelo Radar da Vitale."
        action={
          <Link to="/radar" className="inline-flex items-center gap-1 hover:underline">
            Ver Radar de preços <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        }
      />
      <MobileCards label="Bikes em destaque" desktopGrid="sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((e) => (
          <li key={e.id} className="min-w-0 shrink-0 basis-full snap-start">
            <Link to="/radar/$bikeId" params={{ bikeId: e.id }} className={CARD_CLS}>
              <BikeMedia src={e.image} name={e.name} className="aspect-[4/3] w-full" />
              <div className="flex flex-1 flex-col p-4">
                <h3 className="line-clamp-2 font-bold text-ink">{e.name}</h3>
                <p className="mt-auto pt-3 text-2xl font-black text-action">{formatBRL(e.currentPrice)}</p>
                <span className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink group-hover:text-action">
                  Ver bike e histórico <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </div>
            </Link>
          </li>
        ))}
      </MobileCards>
    </section>
  );
}

const CARD_CLS =
  "group flex h-full flex-col overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-line transition hover:-translate-y-0.5 hover:shadow-lg hover:ring-action";

function RadarPanel({ total, card }: { total: number; card?: HomeCard }) {
  return (
    <section
      aria-labelledby="radar-home"
      className="relative flex flex-col overflow-hidden rounded-3xl bg-vt-dark p-6 text-ink-foreground sm:p-8"
    >
      {/* Decoração abstrata (não é dado) */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 text-mint/15"
        viewBox="0 0 200 200"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="100" cy="100" r="30" />
        <circle cx="100" cy="100" r="60" />
        <circle cx="100" cy="100" r="90" />
        <path d="M100 100 L180 60" strokeWidth="3" />
      </svg>
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint text-mint-foreground">
          <BarChart3 className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-xs font-bold tracking-[0.2em] text-mint">RADAR DE PREÇOS</p>
      </div>
      <h2 id="radar-home" className="section-h2 relative mt-4">
        O preço de hoje está bom?
      </h2>
      <p className="relative mt-2 max-w-md text-ink-foreground/80">
        {total > 0 ? (
          <>
            <strong className="text-mint">{total} bikes</strong> monitoradas. Veja o preço atual e a classificação do
            Radar antes de comprar.
          </>
        ) : (
          "Veja o preço atual e a classificação do Radar antes de comprar."
        )}
      </p>
      {card && (
        <Link
          to="/radar/$bikeId"
          params={{ bikeId: card.id }}
          className="relative mt-6 grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-4 rounded-xl border border-ink-foreground/15 bg-ink-foreground/5 p-4 hover:bg-ink-foreground/10"
        >
          <BikeMedia src={card.image} name={card.name} className="h-28 rounded-lg" />
          <span className="min-w-0">
            <strong className="block text-lg">{card.name}</strong>
            <span className="mt-1 block text-2xl font-extrabold text-mint">{formatBRL(card.currentPrice)}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-sm">
              Ver preço e histórico <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </span>
        </Link>
      )}
      <Link
        to="/radar"
        className="relative mt-6 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-mint px-6 text-lg font-bold text-mint-foreground shadow-lg hover:opacity-90 sm:w-fit"
      >
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
    <section
      aria-labelledby="ferramentas"
      className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-card p-6 ring-1 ring-line sm:p-8"
    >
      {/* Alias de âncora para backlinks antigos (/#calc). Sem título duplicado. */}
      <span id="calc" aria-hidden="true" className="block scroll-mt-24" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-mint/20"
      />
      <div className="relative flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-xl bg-mint/25 text-action">
          <Calculator className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="text-xs font-bold tracking-[0.2em] text-action">CALCULADORA DE ECONOMIA</p>
      </div>
      <h2 id="ferramentas" className="section-h2 relative mt-4 text-ink">
        E se o seu trajeto fosse de bike?
      </h2>
      <p className="relative mt-2 max-w-md text-muted-foreground">
        Descubra quanto você pode economizar trocando carro, Uber, ônibus ou outros meios por uma bike elétrica.
      </p>
      <div
        className="relative mt-6 flex flex-wrap items-center justify-center gap-3 rounded-2xl bg-surface p-4"
        aria-label="Composição conceitual: carro, Uber ou ônibus, com custo e trajeto informados por você, comparados à bike elétrica"
        role="img"
      >
        <ul className="flex flex-1 basis-44 justify-around gap-2">
          {from.map(({ icon: Icon, label }) => (
            <li key={label} className="flex flex-col items-center gap-1.5 text-center">
              <span className="grid h-12 w-12 place-items-center rounded-full bg-card text-muted-foreground ring-1 ring-line">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <span className="text-xs font-semibold text-ink">{label}</span>
            </li>
          ))}
        </ul>
        <div className="flex flex-col items-center gap-1 text-center text-xs font-semibold text-ink">
          <span>Custo</span>
          <span>+</span>
          <span>Trajeto</span>
        </div>
        <ArrowRight className="h-7 w-7 shrink-0 text-action" aria-hidden="true" />
        <div className="flex flex-col items-center gap-1.5 text-center">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-action text-primary-foreground shadow-lg ring-4 ring-mint/40">
            <Bike className="h-8 w-8" aria-hidden="true" />
          </span>
          <span className="text-xs font-bold text-action">Bike elétrica</span>
        </div>
      </div>
      <div className="relative mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <Link
          to="/ferramentas"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-action px-6 font-bold text-primary-foreground hover:opacity-90"
        >
          Calcular minha economia <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <Link
          to="/escolherbike"
          reloadDocument
          className="text-sm font-semibold text-action underline underline-offset-2"
        >
          Escolher minha bike
        </Link>
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
        <h2 id="artigos-home" className="border-l-4 border-action pl-3 text-2xl font-bold text-ink">
          Artigos para escolher melhor
        </h2>
        <Link
          to="/conteudos"
          className="inline-flex items-center gap-1 text-sm font-semibold text-action hover:underline"
        >
          Ver todos os artigos <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
      <MobileCards label="Artigos em destaque" desktopGrid="sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((article) => (
          <li key={article.slug} className="min-w-0 shrink-0 basis-full snap-start">
            <Link
              to="/conteudos/$slug"
              params={{ slug: article.slug }}
              className="group flex h-full flex-col overflow-hidden rounded-lg bg-card ring-1 ring-line transition hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
            >
              {article.ogImageUrl && (
                <img
                  src={youtubeThumbnailVariant(article.ogImageUrl) ?? undefined}
                  alt=""
                  width={320}
                  height={180}
                  sizes="(max-width: 640px) 100vw, 33vw"
                  loading="lazy"
                  decoding="async"
                  className="aspect-video w-full object-cover"
                />
              )}
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold text-ink group-hover:text-action">{article.title}</h3>
                {article.summary && (
                  <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{article.summary}</p>
                )}
                {article.publishedAt && !Number.isNaN(Date.parse(article.publishedAt)) && (
                  <time dateTime={article.publishedAt} className="mt-auto pt-4 text-xs text-muted-foreground">
                    {new Intl.DateTimeFormat("pt-BR", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                      timeZone: "UTC",
                    }).format(new Date(article.publishedAt))}
                  </time>
                )}
              </div>
            </Link>
          </li>
        ))}
      </MobileCards>
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
            <RadarPanel total={total} card={cards[0]} />
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
