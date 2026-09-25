// Builder puro do sitemap dinâmico. Sem I/O: recebe dados já lidos e devolve XML.
// Não inventa lastmod: nenhuma data é emitida.
import { BIKE_ID_RE } from "@/lib/bike-identity";
import { SLUG_RE } from "@/lib/editorial-bikes";
import { SITE_URL } from "@/lib/seo";

/** Rotas estáticas públicas e funcionais. Aliases, noindex e rotas inexistentes ficam fora. */
export const STATIC_SITEMAP_PATHS = [
  "/",
  "/radar",
  "/escolherbike",
  "/ferramentas",
  "/conteudos",
  "/calculadoras/economia",
  "/calculadoras/payback",
  "/calculadoras/custo-anual-mobilidade",
  "/calculadoras/uber-vs-bike",
  "/calculadoras/carro-vs-bike",
  "/calculadoras/moto-vs-bike",
  "/calculadoras/transporte-publico-vs-bike",
  "/calculadoras/tempo-no-transito",
  "/calculadoras/tempo-recuperado",
] as const;

const xmlEscape = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

/** Slugs válidos e únicos (padrão editorial). */
export function bikeSlugPaths(bikes: ReadonlyArray<{ slug?: unknown }>): string[] {
  const out = new Set<string>();
  for (const b of bikes) {
    if (typeof b?.slug === "string" && SLUG_RE.test(b.slug)) out.add(`/bikes/${encodeURIComponent(b.slug)}`);
  }
  return [...out];
}

/** IDs do Radar vindos do campo `id` da RPC; nunca derivados de slug. */
export function radarIdPaths(items: ReadonlyArray<unknown>): string[] {
  const out = new Set<string>();
  for (const it of items) {
    const id = (it as { id?: unknown })?.id;
    if (typeof id === "string" && BIKE_ID_RE.test(id)) out.add(`/radar/${encodeURIComponent(id)}`);
  }
  return [...out];
}

/** Only published/indexable editorial slugs returned by the dedicated RPC. */
export function articleSlugPaths(items: ReadonlyArray<{ slug?: unknown }>): string[] {
  const out = new Set<string>();
  for (const item of items) {
    if (typeof item.slug === "string" && SLUG_RE.test(item.slug)) out.add(`/conteudos/${encodeURIComponent(item.slug)}`);
  }
  return [...out];
}

export function buildSitemapXml(paths: ReadonlyArray<string>, origin: string = SITE_URL): string {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const p of paths) {
    if (!p.startsWith("/") || p.startsWith("//")) continue;
    const loc = p === "/" ? `${origin}/` : `${origin}${p}`;
    if (seen.has(loc)) continue;
    seen.add(loc);
    urls.push(`  <url><loc>${xmlEscape(loc)}</loc></url>`);
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`;
}
