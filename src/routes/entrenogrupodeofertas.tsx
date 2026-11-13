import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import { OffersGroupGoogleAdsConsent } from "@/components/site/OffersGroupGoogleAdsConsent";
import { useState } from "react";
import { formatBRL } from "@/lib/price-tracker";
import v9Max from "@/assets/bikes/v9-max.avif";
import gt2000 from "@/assets/bikes/gt2000.avif";
import ft03 from "@/assets/bikes/ft03.avif";
import v20Ultra from "@/assets/bikes/v20-ultra-landing.webp";
import {
  OFFERS_GROUP_ADS_CONSENT_ENABLED,
  OFFERS_GROUP_LANDING_PATH,
  trackOffersGroupCta,
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
  headers: () => ({ "Referrer-Policy": "strict-origin" }),
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

function GroupLink() {
  return (
    <a
      href={canonicalUrl(OFFERS_GROUP_URL)}
      rel="noreferrer"
      onClick={(event) => {
        if (event.nativeEvent.isTrusted) trackOffersGroupCta("hero");
      }}
      onAuxClick={(event) => {
        if (event.button === 1 && event.nativeEvent.isTrusted)
          trackOffersGroupCta("hero");
      }}
      className={`inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 text-center text-base leading-tight font-bold text-ink hover:bg-mint/90 sm:w-auto sm:px-6 ${focus}`}
    >
      <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
      Entrar no grupo no WhatsApp
    </a>
  );
}

// Public Radar snapshot of the full historical range, checked on 13/11/2026.
const bikes = [
  { id: "v9_max", name: "V9 Max", image: v9Max, high: 7890, low: 5888 },
  { id: "gt2000", name: "GT2000", image: gt2000, high: 10087, low: 9375 },
  { id: "ft03", name: "FT03", image: ft03, high: 8399, low: 5609 },
  {
    id: "v20_ultra",
    name: "V20 Ultra",
    image: v20Ultra,
    high: 7799,
    low: 7019,
  },
];

const percent = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function OffersCarousel() {
  const [active, setActive] = useState(0);
  const bike = bikes[active];
  const savings = ((bike.high - bike.low) / bike.high) * 100;

  function move(step: number) {
    setActive((current) => (current + step + bikes.length) % bikes.length);
  }

  return (
    <section
      aria-label="Ofertas do Radar de preços"
      className="min-w-0 rounded-3xl bg-logo-surface p-3 text-ink sm:p-4"
    >
      <div aria-live="polite" aria-atomic="true">
        <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-2xl bg-white sm:h-64">
          <img
            src={bike.image}
            alt={`Bicicleta elétrica ${bike.name}`}
            width={480}
            height={320}
            decoding="async"
            className="h-full w-full object-contain p-2"
          />
          <span className="absolute top-2 left-2 rounded-lg bg-mint px-2.5 py-1.5 text-sm font-bold text-ink">
            {percent.format(savings)}% de diferença
          </span>
        </div>
        <div className="px-2 pt-3">
          <h2 className="text-lg font-bold">{bike.name}</h2>
          <p className="text-xl font-bold text-action">
            {formatBRL(bike.high)} → {formatBRL(bike.low)}
          </p>
          <p className="mt-1 text-xs text-ink/80">
            Maior e menor preço registrados no Radar até 13/11/2026.
          </p>
          <a
            className={`inline-flex min-h-11 items-center text-sm font-semibold text-action underline underline-offset-4 ${focus}`}
            href={`/radar/${bike.id}`}
          >
            Ver preço e histórico no Radar
          </a>
        </div>
      </div>
      {bikes.length > 1 && (
        <div className="flex items-center justify-between border-t border-line px-2 pt-1">
          <button
            type="button"
            onClick={() => move(-1)}
            aria-label="Oferta anterior"
            className={`grid size-11 place-items-center rounded-full ${focus}`}
          >
            <ChevronLeft aria-hidden="true" className="size-5" />
          </button>
          <span className="text-sm font-medium">
            {active + 1} de {bikes.length}
          </span>
          <button
            type="button"
            onClick={() => move(1)}
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
  return (
    <div className="offers-group-landing min-h-screen bg-surface text-ink">
      <header className="border-b border-white/15 bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-5 py-3 sm:px-8 sm:py-4">
          <a
            href="/"
            aria-label="Vitale Mobilidade — início"
            className={`flex h-11 w-32 items-center justify-center rounded-md bg-logo-surface p-1.5 sm:h-14 sm:w-40 ${focus}`}
          >
            <img
              src="/vitale-logo-464.avif"
              alt="Vitale Mobilidade"
              width={464}
              height={152}
              className="h-full w-full object-contain"
            />
          </a>
        </div>
      </header>

      <main className="bg-ink text-ink-foreground">
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
            <div className="mt-4 sm:mt-6">
              <GroupLink />
            </div>
            <div className="hidden md:block">
              {OFFERS_GROUP_ADS_CONSENT_ENABLED && (
                <a
                  href="#preferencias"
                  className="mt-3 inline-flex min-h-11 items-center text-sm text-ink-foreground/90 underline"
                >
                  Preferências de medição
                </a>
              )}
            </div>
          </div>
          <OffersCarousel />
          {OFFERS_GROUP_ADS_CONSENT_ENABLED && (
            <div id="preferencias" className="scroll-mt-4 md:col-span-2">
              <OffersGroupGoogleAdsConsent />
            </div>
          )}
        </div>
      </main>

      <footer className="border-t border-white/15 bg-ink text-ink-foreground">
        <div className="mx-auto max-w-6xl px-5 py-3 text-sm leading-relaxed sm:px-8">
          <p>
            A Vitale pode receber uma comissão quando você compra pelos links de
            afiliado.
          </p>
          <a
            href="/privacidade"
            className={`mt-2 inline-flex min-h-11 items-center font-semibold text-mint underline underline-offset-4 ${focus}`}
          >
            Privacidade e uso de dados
          </a>
        </div>
      </footer>
    </div>
  );
}
