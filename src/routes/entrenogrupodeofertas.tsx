import { createFileRoute } from "@tanstack/react-router";
import {
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Pause,
  Play,
} from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { useEffect, useRef, useState } from "react";
import type { CampaignBike } from "@/lib/offers-catalog";
import { getOffersCampaignCatalog } from "@/lib/radar.functions";
import { formatBRL } from "@/lib/price-tracker";
import { OffersAdsConsent } from "@/components/offers/OffersAdsConsent";
import { CampaignOfferCard } from "@/components/offers/CampaignOfferCard";
import {
  OFFERS_GROUP_LANDING_PATH,
  handleOffersGroupCta,
} from "@/lib/offers-group-landing";
import { OFFERS_GROUP_URL } from "@/lib/offers-group";
import {
  canonicalUrl,
  pageHead,
  serializeJsonLd,
  SITE_ORGANIZATION_ID,
} from "@/lib/seo";

import "./-offers-group-landing.css";

const TITLE = "Ofertas de bikes elétricas no seu WhatsApp";
const DESCRIPTION =
  "Acompanhe ofertas de bicicletas elétricas do Mercado Livre selecionadas pela Vitale Mobilidade.";

export const Route = createFileRoute("/entrenogrupodeofertas")({
  loader: () => getOffersCampaignCatalog().catch(() => null),
  headers: () => ({ "Referrer-Policy": "no-referrer" }),
  head: () => ({
    ...pageHead({
      path: OFFERS_GROUP_LANDING_PATH,
      title: `${TITLE} | Vitale Mobilidade`,
      description: DESCRIPTION,
      ogTitle: TITLE,
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: TITLE,
          description: DESCRIPTION,
          url: canonicalUrl(OFFERS_GROUP_LANDING_PATH),
          inLanguage: "pt-BR",
          publisher: { "@id": SITE_ORGANIZATION_ID },
        }),
      },
    ],
  }),
  component: OffersGroupLanding,
});

const focus =
  "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current";

function GroupLink({ position = "hero" }: { position?: "hero" | "sticky" }) {
  return (
    <a
      href={canonicalUrl(OFFERS_GROUP_URL)}
      rel="noreferrer"
      onClick={(event) => handleOffersGroupCta(event, position)}
      onAuxClick={(event) => handleOffersGroupCta(event, position)}
      className={`inline-flex min-h-15 w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 text-center text-lg leading-tight font-bold text-ink shadow-lg shadow-mint/20 hover:bg-mint/90 motion-safe:transition motion-safe:hover:-translate-y-1 motion-safe:active:scale-[0.98] sm:w-auto sm:px-7 ${focus}`}
    >
      <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
      Entrar no grupo no WhatsApp
    </a>
  );
}

function OffersCarousel({ bikes }: { bikes: CampaignBike[] }) {
  const [viewport, carousel] = useEmblaCarousel({
    loop: bikes.length > 1,
    breakpoints: { "(prefers-reduced-motion: reduce)": { duration: 0 } },
  });
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setPlaying(!preference.matches);
    syncPreference();
    preference.addEventListener("change", syncPreference);
    return () => preference.removeEventListener("change", syncPreference);
  }, []);

  useEffect(() => {
    if (!carousel) return;
    const update = () => setActive(carousel.selectedScrollSnap());
    update();
    setReady(true);
    carousel.on("select", update);
    carousel.on("reInit", update);
    return () => {
      carousel.off("select", update);
      carousel.off("reInit", update);
    };
  }, [carousel]);

  useEffect(() => {
    if (!carousel || !playing || bikes.length < 2) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) carousel.scrollNext();
    }, 5000);
    return () => window.clearInterval(timer);
  }, [bikes.length, carousel, playing]);

  return (
    <section
      aria-label="Bicicletas elétricas"
      onFocusCapture={(event) => {
        if (!event.target.closest("[data-rotation-control]")) setPlaying(false);
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") setPlaying(false);
      }}
      className="min-w-0 rounded-3xl bg-logo-surface p-3 text-ink sm:p-4"
    >
      <div
        ref={viewport}
        onPointerDown={() => setPlaying(false)}
        className="overflow-hidden rounded-2xl"
      >
        <div className="flex touch-pan-y">
          {bikes.map((bike, index) => (
            <div
              key={bike.id}
              className="min-w-0 flex-[0_0_100%]"
              aria-hidden={index !== active}
              inert={index !== active}
            >
              <CampaignOfferCard
                bike={bike}
                position="hero"
                price={formatBRL(bike.offer?.price)}
              />
            </div>
          ))}
        </div>
      </div>
      {bikes.length > 1 && (
        <div className="flex items-center justify-between border-t border-line px-2 pt-1">
          <button
            type="button"
            disabled={!ready}
            onClick={() => carousel?.scrollPrev()}
            aria-label="Oferta anterior"
            className={`grid size-11 place-items-center rounded-full ${focus}`}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <span
            className="text-sm font-medium"
            aria-live={playing ? "off" : "polite"}
          >
            {active + 1} de {bikes.length}
          </span>
          <button
            type="button"
            disabled={!ready}
            data-rotation-control
            onClick={() => setPlaying((value) => !value)}
            aria-label={playing ? "Pausar carrossel" : "Reproduzir carrossel"}
            className={`grid size-11 place-items-center rounded-full ${focus}`}
          >
            {playing ? (
              <Pause aria-hidden="true" className="size-4" />
            ) : (
              <Play aria-hidden="true" className="size-4" />
            )}
          </button>
          <button
            type="button"
            disabled={!ready}
            onClick={() => carousel?.scrollNext()}
            aria-label="Próxima oferta"
            className={`grid size-11 place-items-center rounded-full ${focus}`}
          >
            <ChevronRight aria-hidden="true" className="size-5" />
          </button>
        </div>
      )}
    </section>
  );
}

function OffersGroupLanding() {
  const catalog = Route.useLoaderData();
  const primaryAction = useRef<HTMLDivElement>(null);
  const [showStickyAction, setShowStickyAction] = useState(false);

  useEffect(() => {
    const action = primaryAction.current;
    if (!action || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => {
      setShowStickyAction(
        !entry.isIntersecting && entry.boundingClientRect.bottom <= 0,
      );
    });
    observer.observe(action);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="offers-group-landing min-h-screen bg-ink text-ink-foreground">
      <header className="border-b border-white/15 bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8 sm:py-4">
          <div className="flex h-11 w-32 items-center justify-center rounded-md bg-logo-surface p-1.5 sm:h-14 sm:w-40">
            <img
              src="/vitale-logo-464.avif"
              alt="Vitale Mobilidade"
              width={464}
              height={152}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
      </header>

      <main className="bg-ink pb-24 text-ink-foreground sm:pb-0">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 py-6 sm:px-8 sm:py-10 md:grid-cols-[1.15fr_1fr] md:items-start md:gap-10 lg:gap-14 lg:py-14">
          <div className="md:pt-6">
            <p className="text-xs font-bold tracking-widest text-mint uppercase sm:text-sm">
              Grupo de ofertas da Vitale
            </p>
            <h1 className="mt-3 text-[1.9rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl">
              {TITLE}
            </h1>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-ink-foreground/90 sm:text-lg">
              {DESCRIPTION}
            </p>
            <div ref={primaryAction} className="mt-4 sm:mt-6">
              <GroupLink />
              <OffersAdsConsent />
            </div>
          </div>
          {!!catalog?.highlights.length && (
            <OffersCarousel bikes={catalog.highlights} />
          )}
        </div>

        <section
          aria-labelledby="campaign-catalog"
          className="mx-auto max-w-6xl px-5 pt-2 pb-12 sm:px-8"
        >
          <h2 id="campaign-catalog" className="text-2xl font-bold">
            Bikes no Radar
          </h2>
          {catalog?.bikes.length ? (
            <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.bikes.map((bike) => (
                <li key={bike.id}>
                  <CampaignOfferCard
                    bike={bike}
                    position="grid"
                    price={formatBRL(bike.offer?.price)}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm">Ofertas indisponíveis no momento.</p>
          )}
        </section>
      </main>

      {showStickyAction && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/15 bg-ink px-5 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
          <GroupLink position="sticky" />
        </div>
      )}
    </div>
  );
}
