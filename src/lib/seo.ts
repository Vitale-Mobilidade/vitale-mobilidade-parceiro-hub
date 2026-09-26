// Contrato de metadata SSR (Etapa 2). Base canônica fixa, sem query/UTM/hash.
export const SITE_URL = "https://vitalemobilidade.com";
export const SITE_NAME = "Vitale Mobilidade";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og/vitale-home-1200x630.jpg`;

/** Serializa JSON-LD sem permitir que dados dinâmicos encerrem a tag script. */
export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

/** Monta URL canônica absoluta a partir de um path, descartando query e hash. */
export function canonicalUrl(path: string): string {
  const clean = (path || "/").split(/[?#]/)[0] || "/";
  const withSlash = clean.startsWith("/") ? clean : `/${clean}`;
  return withSlash === "/" ? `${SITE_URL}/` : `${SITE_URL}${withSlash.replace(/\/+$/, "")}`;
}

type PageMetaInput = {
  path: string;
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogType?: "website" | "product" | "article";
  robots?: string;
  image?: {
    url: string;
    width?: number;
    height?: number;
    type?: string;
    alt?: string;
  };
};

/** head() padronizado: title, description, canonical, OG e Twitter, uma vez cada. */
export function pageHead(input: PageMetaInput) {
  const url = canonicalUrl(input.path);
  const ogTitle = input.ogTitle ?? input.title;
  const ogDescription = input.ogDescription ?? input.description;
  const image = input.image ?? {
    url: DEFAULT_OG_IMAGE,
    width: 1200,
    height: 630,
    type: "image/jpeg",
    alt: ogTitle,
  };
  const meta: Array<Record<string, string>> = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: url },
    { property: "og:type", content: input.ogType ?? "website" },
    { property: "og:image", content: image.url },
    { property: "og:image:alt", content: image.alt ?? ogTitle },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
    { name: "twitter:image", content: image.url },
    { name: "twitter:image:alt", content: image.alt ?? ogTitle },
  ];
  if (image.width) meta.push({ property: "og:image:width", content: String(image.width) });
  if (image.height) meta.push({ property: "og:image:height", content: String(image.height) });
  if (image.type) meta.push({ property: "og:image:type", content: image.type });
  if (input.robots) meta.push({ name: "robots", content: input.robots });
  return { meta, links: [{ rel: "canonical", href: url }] };
}
