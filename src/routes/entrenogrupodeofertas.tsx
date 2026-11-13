import { createFileRoute } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";
import ft03 from "@/assets/bikes/ft03.avif";
import {
  OFFERS_GROUP_LANDING_PATH,
  trackOffersGroupCta,
  type OffersGroupCtaPosition,
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

function GroupLink({ position }: { position: OffersGroupCtaPosition }) {
  return (
    <a
      href={canonicalUrl(OFFERS_GROUP_URL)}
      rel="noreferrer"
      onClick={(event) => {
        if (event.nativeEvent.isTrusted) trackOffersGroupCta(position);
      }}
      onAuxClick={(event) => {
        if (event.button === 1 && event.nativeEvent.isTrusted)
          trackOffersGroupCta(position);
      }}
      className={`inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl bg-mint px-4 py-3 text-center text-base leading-tight font-bold text-ink hover:bg-mint/90 sm:w-auto sm:px-6 ${focus}`}
    >
      <MessageCircle aria-hidden="true" className="size-5 shrink-0" />
      Entrar no grupo no WhatsApp
    </a>
  );
}

const FAQ = [
  {
    question: "Como faço para entrar no grupo?",
    answer:
      "Toque no botão, abra o convite no WhatsApp e confirme sua entrada por lá. Você não precisa preencher cadastro no site da Vitale.",
  },
  {
    question: "Onde eu compro a bicicleta?",
    answer:
      "A compra é feita no Mercado Livre, pelo anúncio da oferta. O grupo serve para acompanhar as indicações da Vitale.",
  },
  {
    question: "Como confiro o preço e a disponibilidade?",
    answer:
      "Abra a oferta no Mercado Livre e confira a versão da bike, o preço, o estoque e o frete para seu CEP. As condições podem mudar depois que a mensagem é publicada.",
  },
];

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

      <main>
        <section className="bg-ink text-ink-foreground">
          <div className="mx-auto max-w-6xl px-5 pt-10 pb-12 sm:px-8 sm:pt-16 sm:pb-20">
            <p className="text-xs font-bold tracking-widest text-mint uppercase sm:text-sm">
              Grupo de ofertas da Vitale
            </p>
            <h1 className="mt-4 max-w-4xl text-[2rem] leading-[1.1] font-extrabold tracking-tight text-balance sm:text-5xl lg:text-6xl">
              {TITLE}
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-ink-foreground/90 sm:text-lg">
              {DESCRIPTION}
            </p>
            <div className="mt-6 sm:mt-8">
              <GroupLink position="hero" />
              <p className="mt-3 text-sm leading-relaxed text-ink-foreground/80">
                O convite abre no WhatsApp. A compra é no Mercado Livre.
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
          <section
            aria-labelledby="como-funciona"
            className="grid items-start gap-7 lg:grid-cols-[1fr_1fr] lg:gap-14"
          >
            <div>
              <h2
                id="como-funciona"
                className="text-2xl font-extrabold tracking-tight sm:text-3xl"
              >
                Como a curadoria funciona
              </h2>
              <p className="mt-3 max-w-xl leading-relaxed">
                A Vitale seleciona ofertas de bikes elétricas no Mercado Livre.
                Antes de comprar, use o nome do modelo e a versão anunciada para
                comparar com outras opções.
              </p>
              <ol className="mt-6 space-y-4">
                {[
                  [
                    "No grupo",
                    "Veja o modelo, o preço informado na publicação e o link da oferta.",
                  ],
                  [
                    "No anúncio",
                    "Confira se é a versão que você procura e veja o preço, o estoque e o frete para seu endereço.",
                  ],
                ].map(([label, detail], index) => (
                  <li key={label} className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-sm font-bold text-mint"
                    >
                      {index + 1}
                    </span>
                    <p className="leading-relaxed">
                      <strong>{label}:</strong> {detail}
                    </p>
                  </li>
                ))}
              </ol>
              <a
                href="/radar"
                className={`mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-action underline underline-offset-4 ${focus}`}
              >
                Compare modelos no Radar{" "}
                <ArrowRight aria-hidden="true" className="size-4" />
              </a>
            </div>

            <figure className="overflow-hidden rounded-2xl border border-line bg-card">
              <div className="grid place-items-center bg-logo-surface px-6 py-3">
                <img
                  src={ft03}
                  alt="Bicicleta elétrica Mangosteen FT03"
                  width={800}
                  height={697}
                  loading="lazy"
                  decoding="async"
                  className="h-44 w-full object-contain sm:h-52"
                />
              </div>
              <figcaption className="border-t border-line p-5 sm:p-6">
                <p className="text-xs font-bold tracking-wider text-action uppercase">
                  Exemplo ilustrativo
                </p>
                <p className="mt-1 text-xl font-bold">Mangosteen FT03</p>
                <dl className="mt-3 space-y-2 text-sm leading-relaxed">
                  <div>
                    <dt className="inline font-semibold">Preço:</dt>{" "}
                    <dd className="inline">
                      a mensagem indica o valor visto na publicação.
                    </dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold">Oferta:</dt>{" "}
                    <dd className="inline">
                      a mensagem leva ao anúncio no Mercado Livre.
                    </dd>
                  </div>
                </dl>
                <p className="mt-4 text-sm font-semibold">
                  Este exemplo não é uma oferta ativa.
                </p>
              </figcaption>
            </figure>
          </section>

          <section
            aria-labelledby="perguntas"
            className="mt-12 border-t border-line pt-9 sm:mt-16"
          >
            <h2
              id="perguntas"
              className="text-2xl font-extrabold tracking-tight sm:text-3xl"
            >
              Perguntas frequentes
            </h2>
            <dl className="mt-5 grid gap-3 lg:grid-cols-3">
              {FAQ.map(({ question, answer }) => (
                <div
                  key={question}
                  className="rounded-xl border border-line bg-card p-4 sm:p-5"
                >
                  <dt className="font-bold">{question}</dt>
                  <dd className="mt-2 leading-relaxed">{answer}</dd>
                </div>
              ))}
            </dl>
            <div className="mt-7">
              <GroupLink position="after_faq" />
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-line bg-logo-surface">
        <div className="mx-auto max-w-6xl px-5 py-6 text-sm leading-relaxed sm:px-8">
          <p>
            A Vitale pode receber uma comissão quando você compra pelos links de
            afiliado.
          </p>
          <a
            href="/privacidade"
            className={`mt-2 inline-flex min-h-11 items-center font-semibold text-action underline underline-offset-4 ${focus}`}
          >
            Privacidade e uso de dados
          </a>
        </div>
      </footer>
    </div>
  );
}
