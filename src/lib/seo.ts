// Contrato de metadata SSR (Etapa 2). Base canônica fixa, sem query/UTM/hash.
export const SITE_URL = "https://vitalemobilidade.com";
export const SITE_NAME = "Vitale Mobilidade";

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
};

/** head() padronizado: title, description, canonical, OG e Twitter, uma vez cada. */
export function pageHead(input: PageMetaInput) {
  const url = canonicalUrl(input.path);
  const ogTitle = input.ogTitle ?? input.title;
  const ogDescription = input.ogDescription ?? input.description;
  const meta: Array<Record<string, string>> = [
    { title: input.title },
    { name: "description", content: input.description },
    { property: "og:title", content: ogTitle },
    { property: "og:description", content: ogDescription },
    { property: "og:url", content: url },
    { property: "og:type", content: input.ogType ?? "website" },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: ogTitle },
    { name: "twitter:description", content: ogDescription },
  ];
  if (input.robots) meta.push({ name: "robots", content: input.robots });
  return { meta, links: [{ rel: "canonical", href: url }] };
}
