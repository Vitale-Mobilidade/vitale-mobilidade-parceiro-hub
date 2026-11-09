import { createFileRoute, Link } from "@tanstack/react-router";
import lucasVitalePortrait from "@/assets/lucas-vitale-560.webp";
import { SiteFooter, SiteHeader } from "@/components/site/site-ui";
import { externalLinkProps } from "@/lib/external-link";
import {
  canonicalUrl,
  pageHead,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_FOUNDER,
  SITE_ORGANIZATION_ID,
} from "@/lib/seo";
import { YOUTUBE_CHANNEL } from "@/lib/social-links";

const title = "Sobre a Vitale Mobilidade";
const textLink = "font-semibold text-action underline underline-offset-4";
const velaBikesSource =
  "https://www.planetadabike.com/single-post/2017/09/29/bicicletas-el%C3%A9tricas-de-pedal-assistido-est%C3%A3o-com-fome-de-mercado";
const voltzSource =
  "https://institucional.ifood.com.br/inovacao/7-destaques-do-lancamento-da-moto-eletrica-do-ifood/";

export const Route = createFileRoute("/sobre")({
  head: () => ({
    ...pageHead({
      path: "/sobre",
      title: `${title} | Testes de bicicletas elétricas`,
      description:
        "Conheça a trajetória de Lucas Vitale, fundador da Vitale Mobilidade, e veja como o canal testa bicicletas elétricas.",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          "@id": canonicalUrl("/sobre"),
          url: canonicalUrl("/sobre"),
          name: title,
          inLanguage: "pt-BR",
          mainEntity: { "@id": SITE_ORGANIZATION_ID },
        }),
      },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="responsive-container py-12 sm:py-16">
        <article className="mx-auto max-w-3xl text-ink">
          <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
          <p className="mt-4 text-lg leading-relaxed">{SITE_DESCRIPTION}</p>
          <p className="mt-3 leading-relaxed">
            Você pode acompanhar os testes no{" "}
            <a
              href={YOUTUBE_CHANNEL}
              {...externalLinkProps(YOUTUBE_CHANNEL)}
              className={textLink}
            >
              canal oficial da Vitale no YouTube
            </a>{" "}
            e consultar os{" "}
            <Link to="/conteudos" className={textLink}>
              artigos da Vitale
            </Link>{" "}
            aqui no site.
          </p>

          <section
            id={SITE_FOUNDER.anchor}
            aria-labelledby="fundador-heading"
            className="mt-10 flex scroll-mt-24 flex-col gap-4 sm:flex-row sm:items-start sm:gap-6"
          >
            <img
              src={lucasVitalePortrait}
              alt="Retrato de Lucas Vitale"
              width={560}
              height={560}
              decoding="async"
              className="size-28 shrink-0 rounded-xl object-cover sm:size-36"
            />
            <div className="space-y-3 leading-relaxed">
              <h2 id="fundador-heading" className="text-2xl font-bold">
                {SITE_FOUNDER.name}, fundador da Vitale Mobilidade
              </h2>
              <p>
                Lucas trabalha há mais de uma década com mobilidade elétrica no
                Brasil. Em 2017, já atuava com bicicletas elétricas na{" "}
                <a
                  href={velaBikesSource}
                  {...externalLinkProps(velaBikesSource)}
                  className={textLink}
                >
                  Vela Bikes
                </a>
                . Na Voltz, participou da{" "}
                <a
                  href={voltzSource}
                  {...externalLinkProps(voltzSource)}
                  className={textLink}
                >
                  apresentação da moto elétrica para entregas do iFood
                </a>
                .
              </p>
              <a
                href={SITE_FOUNDER.profile}
                {...externalLinkProps(SITE_FOUNDER.profile)}
                className={textLink}
              >
                Lucas Vitale no LinkedIn
              </a>
            </div>
          </section>

          <section className="mt-10 space-y-3 leading-relaxed">
            <h2 className="text-2xl font-bold">
              Como analisamos as bicicletas elétricas
            </h2>
            <p>
              Nos relatos de teste, descrevemos o que aconteceu com a bike nas
              condições mostradas no vídeo. Para entender um resultado, vale
              olhar o trajeto, as subidas, o modo de assistência e a carga
              transportada, quando esses dados estão disponíveis.
            </p>
            <p>
              A ficha técnica informa o que é declarado para o modelo. Já um
              trajeto registrado mostra o desempenho naquele uso. No teste da V9
              Max, por exemplo, a bike percorreu 19 km com uso frequente do
              acelerador. Como o percurso terminou com carga restante, ele
              serviu para observar o consumo, e a autonomia total ficou em
              aberto.
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>
                <Link
                  to="/conteudos/$slug"
                  params={{
                    slug: "v9-max-em-um-deslocamento-de-19-km-o-que-o-uso-intenso-indica-sobre-a-autonomia",
                  }}
                  className={textLink}
                >
                  V9 Max em 19 km de uso intenso
                </Link>
              </li>
              <li>
                <Link
                  to="/conteudos/$slug"
                  params={{ slug: "bike-eletrica-v8-pro-1000w-sobe-ladeira" }}
                  className={textLink}
                >
                  V8 Pro em subida e no uso a dois
                </Link>
              </li>
            </ul>
          </section>

          <section className="mt-10 space-y-3 leading-relaxed">
            <h2 className="text-2xl font-bold">Como funciona o Radar Vitale</h2>
            <p>
              O{" "}
              <Link to="/radar" className={textLink}>
                Radar Vitale
              </Link>{" "}
              reúne a ficha de cada bike monitorada, o último preço registrado e
              seu histórico. Confira o valor, a versão e a disponibilidade no
              anúncio antes de comprar.
            </p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
