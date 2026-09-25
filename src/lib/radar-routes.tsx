// Definições compartilhadas das rotas do Radar (/acompanhamento legado e /radar alvo).
// Mesmo loader e headers de falha (503 via src/server.ts); canonical público sempre em /radar.
import { Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { safeVideos } from "@/lib/videos.functions";
import { getRadarBike, getRadarCatalog, RADAR_UNAVAILABLE_HEADERS } from "@/lib/radar.functions";
import { formatBRL, isSafePurchaseLink } from "@/lib/price-tracker";
import { BIKE_ID_RE } from "@/lib/bike-identity";
import { SITE_ORIGIN, type RadarBase } from "@/lib/radar-base";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";
import { getPublishedArticlesForBike } from "@/lib/editorial.functions";

export async function loadRadarCatalog() {
  const [r, videos, catalog] = await Promise.all([getRadarCatalog(), safeVideos({ limit: 4 }), getBikeCatalog().catch(() => ({ ok: false, bikes: [] }))]);
  return { ...r, videos, catalog: catalog.ok ? catalog.bikes : [] };
}
export type RadarCatalogData = Awaited<ReturnType<typeof loadRadarCatalog>>;

export async function loadRadarBike(bikeId: string) {
  const [r, videos, articleIndex, catalog] = await Promise.all([
    getRadarBike({ data: { bikeId } }),
    safeVideos({ bikeId, limit: 200 }),
    getPublishedArticlesForBike({ data: bikeId }).catch(() => null),
    getBikeCatalog().catch(() => ({ ok: false, bikes: [] })),
  ]);
  // Leitura bem-sucedida, mas bike não existe (ID inválido ou desconhecido): 404 nativo.
  if (r.ok && (r.bike === null || r.bike === undefined)) throw notFound();
  const articles = (articleIndex ?? []).slice(0, 6);
  const catalogBikes = catalog.ok ? catalog.bikes : [];
  const detail = r.ok ? r.bike as { hasCurrentOffer?: unknown; currentPrice?: unknown; link?: unknown } | null : null;
  const catalogBike = catalogBikes.find((bike) => bike.bikeId === bikeId) ?? null;
  // A coluna da bike principal usa o mesmo par oferta/preço da hero, sem criar duas leituras divergentes.
  const currentCatalogBike = catalogBike && r.ok
    ? detail?.hasCurrentOffer === true && typeof detail.currentPrice === "number" && detail.currentPrice > 0 &&
      typeof detail.link === "string" && /^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(detail.link)
      ? { ...catalogBike, sheetPrice: detail.currentPrice, link: detail.link }
      : { ...catalogBike, sheetPrice: null, link: null }
    : catalogBike;
  return {
    ...r,
    videos,
    articles,
    catalogBike: currentCatalogBike,
    comparisonBikes: catalogBikes.filter((bike) => bike.bikeId !== bikeId),
  };
}
export type RadarBikeData = Awaited<ReturnType<typeof loadRadarBike>>;

// Falha temporária: marcador + Retry-After/no-store; src/server.ts troca o status para 503.
export function radarHeaders({ loaderData }: { loaderData?: { ok?: boolean } }) {
  return loaderData && loaderData.ok === false ? RADAR_UNAVAILABLE_HEADERS : undefined;
}

const TITLE = "Radar de Preços de Bikes Elétricas | Vitale Mobilidade";
const DESCRIPTION =
  "Veja se hoje é um bom momento para comprar sua bike elétrica: compare o preço atual com o histórico real registrado pela Vitale.";
const OG_TITLE = "Veja se hoje é um bom momento para comprar sua bike";
const OG_DESCRIPTION =
  "Compare o preço atual com o histórico e acompanhe as melhores oportunidades de bikes elétricas.";

export function radarCatalogHead(base: RadarBase) {
  const url = `${SITE_ORIGIN}${base}`;
  return {
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: OG_TITLE },
      { name: "twitter:description", content: OG_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

const FALLBACK_TITLE = "Histórico de preços | Vitale Mobilidade";
const FALLBACK_DESCRIPTION = "Histórico real de preços de bikes elétricas acompanhado pela Vitale Mobilidade.";

type HeadBike = { name?: unknown; currentPrice?: unknown; image?: unknown; description?: unknown; autonomyKm?: unknown; capacity?: unknown; hasCurrentOffer?: unknown; link?: unknown };

function validBike(loaderData: unknown): { name: string; price: number | null; image: string | null; description: string | null; autonomyKm: number | null; capacity: number | null; category: string | null; link: string | null } | null {
  const d = loaderData as { ok?: boolean; bike?: HeadBike | null; catalogBike?: { description?: unknown; category?: unknown } | null } | undefined;
  const b = d?.ok ? d.bike : null;
  if (!b || typeof b.name !== "string" || !b.name.trim()) return null;
  const price = b.hasCurrentOffer === true && typeof b.currentPrice === "number" && Number.isFinite(b.currentPrice) && b.currentPrice > 0 ? b.currentPrice : null;
  const image = typeof b.image === "string" && /^https:\/\/[^\s"<>]+$/.test(b.image) ? b.image : null;
  const rawDescription = d?.catalogBike?.description ?? b.description;
  const description = typeof rawDescription === "string" ? rawDescription.replace(/\s+/g, " ").trim() || null : null;
  const autonomyKm = typeof b.autonomyKm === "number" && b.autonomyKm > 0 ? b.autonomyKm : null;
  const capacity = typeof b.capacity === "number" && b.capacity > 0 ? b.capacity : null;
  const category = typeof d?.catalogBike?.category === "string" ? d.catalogBike.category : null;
  const link = price !== null && typeof b.link === "string" && /^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(b.link) && isSafePurchaseLink(b.link) ? b.link : null;
  return { name: b.name.trim(), price, image, description, autonomyKm, capacity, category, link };
}

export function radarBikeHead(_base: RadarBase, bikeId: string, loaderData: unknown) {
  const bike = validBike(loaderData);
  const idOk = BIKE_ID_RE.test(bikeId);
  const canonical = idOk ? `${SITE_ORIGIN}/radar/${encodeURIComponent(bikeId)}` : `${SITE_ORIGIN}/radar`;

  // loaderData ausente = notFound() lançado (leitura ok, bike inexistente).
  const notFoundCase = loaderData === undefined;
  const failed = !notFoundCase && !(loaderData as { ok?: boolean } | undefined)?.ok;
  const fallback = [
    { title: FALLBACK_TITLE },
    { name: "description", content: FALLBACK_DESCRIPTION },
    { property: "og:title", content: FALLBACK_TITLE },
    { property: "og:description", content: FALLBACK_DESCRIPTION },
    { name: "twitter:title", content: FALLBACK_TITLE },
    { name: "twitter:description", content: FALLBACK_DESCRIPTION },
  ];
  if (failed) {
    // Erro temporário: sem noindex e sem nome/preço/imagem; o status 503 sinaliza a indisponibilidade.
    return {
      meta: [...fallback, { name: "twitter:card", content: "summary_large_image" }],
      links: [{ rel: "canonical", href: canonical }],
    };
  }
  if (!bike) {
    return {
      meta: [
        ...fallback,
        { name: "robots", content: "noindex, follow" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: canonical }],
    };
  }

  const title = `${bike.name}: preço, ficha técnica e comparativo | Vitale Mobilidade`;
  const ogTitle = `${bike.name}: conheça a bike e seu histórico de preços`;
  const facts = [bike.autonomyKm && `autonomia declarada de até ${bike.autonomyKm} km`, bike.capacity && `capacidade para ${bike.capacity} pessoa(s)`].filter(Boolean).join(" e ");
  const description = `${bike.name}${bike.price !== null && bike.link ? `: oferta atual de ${formatBRL(bike.price)}` : ""}${facts ? `, ${facts}` : ""}. Veja histórico de preços, ficha técnica, comparação e conteúdos da Vitale.`;
  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#bike`,
    name: bike.name,
    url: canonical,
    ...(bike.image ? { image: [bike.image] } : {}),
    ...(bike.description ? { description: bike.description } : {}),
    additionalProperty: [
      ...(bike.autonomyKm ? [{ "@type": "PropertyValue", name: "Autonomia declarada", value: `${bike.autonomyKm} km` }] : []),
      ...(bike.capacity ? [{ "@type": "PropertyValue", name: "Capacidade", value: `${bike.capacity} pessoa(s)` }] : []),
      ...(bike.category ? [{ "@type": "PropertyValue", name: "Categoria", value: bike.category }] : []),
    ],
    ...(bike.price !== null && bike.link ? { offers: { "@type": "Offer", price: bike.price, priceCurrency: "BRL", url: bike.link } } : {}),
  };
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: `${SITE_ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: "Radar de preços", item: `${SITE_ORIGIN}/radar` },
      { "@type": "ListItem", position: 3, name: bike.name, item: canonical },
    ],
  };

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: ogTitle },
      { property: "og:description", content: description },
      { property: "og:url", content: canonical },
      { property: "og:type", content: "product" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: ogTitle },
      { name: "twitter:description", content: description },
      ...(bike.image
        ? [
            { property: "og:image", content: bike.image },
            { name: "twitter:image", content: bike.image },
          ]
        : []),
    ],
    links: [{ rel: "canonical", href: canonical }],
    scripts: [{ type: "application/ld+json", children: JSON.stringify([product, breadcrumbs]).replace(/</g, "\\u003c") }],
  };
}

export function RadarBikeNotFound({ base }: { base: RadarBase }) {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="responsive-container py-8 md:py-12">
        <Link
          to={base}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar para o Radar de Preços
        </Link>
        <p className="mt-8 rounded-xl border border-border bg-muted/40 p-6 text-sm text-muted-foreground">
          Não encontramos acompanhamento para esta bike no momento.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
