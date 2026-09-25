// Definições compartilhadas das rotas do Radar (/acompanhamento legado e /radar alvo).
// Mesmo loader, mesmos headers de falha (503 via src/server.ts), mesmo head — só muda a base/canonical.
import { Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/site/site-ui";
import { safeVideos } from "@/lib/videos.functions";
import { getRadarBike, getRadarCatalog, RADAR_UNAVAILABLE_HEADERS } from "@/lib/radar.functions";
import { formatBRL } from "@/lib/price-tracker";
import { BIKE_ID_RE } from "@/lib/bike-identity";
import { SITE_ORIGIN, type RadarBase } from "@/lib/radar-base";
import { getBikeCatalog } from "@/lib/editorial-bikes.functions";

export async function loadRadarCatalog() {
  const [r, videos, catalog] = await Promise.all([getRadarCatalog(), safeVideos({ limit: 4 }), getBikeCatalog()]);
  return { ...r, videos, catalog: catalog.ok ? catalog.bikes : [] };
}
export type RadarCatalogData = Awaited<ReturnType<typeof loadRadarCatalog>>;

export async function loadRadarBike(bikeId: string) {
  const [r, videos] = await Promise.all([
    getRadarBike({ data: { bikeId } }),
    safeVideos({ bikeId, limit: 4 }),
  ]);
  // Leitura bem-sucedida, mas bike não existe (ID inválido ou desconhecido): 404 nativo.
  if (r.ok && (r.bike === null || r.bike === undefined)) throw notFound();
  return { ...r, videos };
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

type HeadBike = { name?: unknown; currentPrice?: unknown; image?: unknown };

function validBike(loaderData: unknown): { name: string; price: number | null; image: string | null } | null {
  const d = loaderData as { ok?: boolean; bike?: HeadBike | null } | undefined;
  const b = d?.ok ? d.bike : null;
  if (!b || typeof b.name !== "string" || !b.name.trim()) return null;
  const price = typeof b.currentPrice === "number" && b.currentPrice > 0 ? b.currentPrice : null;
  const image = typeof b.image === "string" && /^https:\/\/[^\s"<>]+$/.test(b.image) ? b.image : null;
  return { name: b.name.trim(), price, image };
}

export function radarBikeHead(base: RadarBase, bikeId: string, loaderData: unknown) {
  const BASE = `${SITE_ORIGIN}${base}`;
  const bike = validBike(loaderData);
  const idOk = BIKE_ID_RE.test(bikeId);
  const canonical = idOk ? `${BASE}/${encodeURIComponent(bikeId)}` : BASE;

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

  const title = `${bike.name} — histórico de preços | Vitale Mobilidade`;
  const ogTitle = `${bike.name} — histórico de preços`;
  const description = bike.price
    ? `${bike.name}: preço de hoje ${formatBRL(bike.price)} e histórico real registrado pela Vitale Mobilidade.`
    : FALLBACK_DESCRIPTION;

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
