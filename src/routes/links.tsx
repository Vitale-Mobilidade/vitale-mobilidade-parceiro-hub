import { WosiBanner } from "@/components/site/WosiBanner";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Bike,
  Headphones,
  Instagram,
  Mail,
  MessageCircle,
  Play,
  Radar,
  Youtube,
} from "lucide-react";
import type { ReactNode } from "react";
import { externalLinkProps } from "@/lib/external-link";
import {
  canonicalUrl,
  pageHead,
  serializeJsonLd,
  SITE_ORGANIZATION_ID,
} from "@/lib/seo";
import { SOCIAL_LINKS, YOUTUBE_CHANNEL } from "@/lib/social-links";
import "./-links.css";

const title = "Links da Vitale Mobilidade | Bikes elétricas";
const description =
  "Vídeos completos, Quiz da bike ideal, grupo de ofertas, Radar de preços e newsletter. Encontre os canais oficiais da Vitale Mobilidade.";
// Endereço do programa confirmado pelo responsável nesta conversa.
const spotifyUrl =
  "https://open.spotify.com/show/4RSscwjzEskRAMNwqgA5r9?si=da3cc4fb33ce4e44";

export const Route = createFileRoute("/links")({
  head: () => ({
    ...pageHead({
      path: "/links",
      title,
      description,
      robots: "noindex, follow",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: serializeJsonLd({
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: title,
          description,
          url: canonicalUrl("/links"),
          inLanguage: "pt-BR",
          publisher: { "@id": SITE_ORGANIZATION_ID },
        }),
      },
    ],
  }),
  component: BioLinksPage,
});

function LinkContent({
  icon,
  title,
  subtitle,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <>
      <span className="bio-link-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="bio-link-copy">
        <span className="bio-link-title">{title}</span>
        <span className="bio-link-subtitle">{subtitle}</span>
      </span>
    </>
  );
}

function BioLinksPage() {
  const instagramUrl =
    SOCIAL_LINKS.find((link) => link.label === "Instagram")?.url ??
    "https://www.instagram.com/vitalemobilidade/";
  return (
    <div className="bio-page">
      <div className="bio-backdrop" aria-hidden="true">
        <span />
        <span />
      </div>
      <div className="bio-container">
        <header className="bio-header">
          <Link
            to="/"
            className="bio-brand"
            aria-label="Vitale Mobilidade — início"
          >
            <img
              src="/vitale-logo-464.avif"
              alt="Vitale Mobilidade"
              width={464}
              height={152}
              decoding="async"
            />
          </Link>
          <h1 className="bio-handle">@vitalemobilidade</h1>
        </header>
        <main className="bio-main">
          <nav className="bio-actions" aria-label="Explore a Vitale">
            <a
              href={YOUTUBE_CHANNEL}
              data-bio-choice="youtube_video"
              {...externalLinkProps(YOUTUBE_CHANNEL)}
              className="bio-link"
            >
              <LinkContent
                icon={<Play />}
                title="Vídeos completos no YouTube"
                subtitle="Testes, comparativos e bikes na prática"
              />
            </a>
            <Link to="/quiz" data-bio-choice="quiz" className="bio-link">
              <LinkContent
                icon={<Bike />}
                title="Faça o quiz e descubra a bike ideal"
                subtitle="Encontre a bike que combina com você"
              />
            </Link>
            <Link
              to="/grupodeofertas"
              data-bio-choice="whatsapp"
              className="bio-link"
              reloadDocument
            >
              <LinkContent
                icon={<MessageCircle />}
                title="Grupo de Ofertas no WhatsApp"
                subtitle="Acompanhe as ofertas selecionadas pela Vitale"
              />
            </Link>
            <Link to="/radar" data-bio-choice="radar" className="bio-link">
              <LinkContent
                icon={<Radar />}
                title="Radar de Preços"
                subtitle="Compare preços e consulte o histórico das bikes"
              />
            </Link>
            <Link
              to="/newsletter"
              data-bio-choice="newsletter"
              className="bio-link"
            >
              <LinkContent
                icon={<Mail />}
                title="Cadastre-se na newsletter"
                subtitle="Conteúdos e destaques da Vitale no seu e-mail"
              />
            </Link>
          </nav>
          <section className="bio-social" aria-labelledby="bio-social-heading">
            <h2 id="bio-social-heading">A Vitale também está aqui</h2>
            <div className="bio-social-links">
              <a
                href={YOUTUBE_CHANNEL}
                data-bio-choice="youtube_channel"
                {...externalLinkProps(YOUTUBE_CHANNEL)}
              >
                <Youtube aria-hidden="true" />
                <span>Canal do YouTube</span>
              </a>
              <a
                href={instagramUrl}
                data-bio-choice="instagram"
                {...externalLinkProps(instagramUrl)}
              >
                <Instagram aria-hidden="true" />
                <span>Instagram</span>
              </a>
              <a
                href={spotifyUrl}
                data-bio-choice="spotify"
                {...externalLinkProps(spotifyUrl)}
              >
                <Headphones aria-hidden="true" />
                <span>Spotify</span>
              </a>
            </div>
          </section>
        </main>
        <div className="responsive-container py-8">
          <WosiBanner />
        </div>
        <footer className="bio-footer">
          <Link to="/">Conheça o site da Vitale</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacidade">Privacidade</Link>
        </footer>
      </div>
    </div>
  );
}
