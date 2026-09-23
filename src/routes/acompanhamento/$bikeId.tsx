import { createFileRoute } from "@tanstack/react-router";
import AcompanhamentoBike from "@/pages/AcompanhamentoBike";
import { getRadarBike, markRadarNotFound, markRadarUnavailable } from "@/lib/radar.functions";
import { formatBRL } from "@/lib/price-tracker";

const BASE = "https://vitalemobilidade.com/acompanhamento";
const BIKE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
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

export const Route = createFileRoute("/acompanhamento/$bikeId")({
  loader: async ({ params }) => {
    const r = await getRadarBike({ data: { bikeId: params.bikeId } });
    // Falha temporária: 503 + Retry-After no SSR; não é tratada como bike inexistente.
    if (!r.ok && typeof window === "undefined") await markRadarUnavailable();
    // Leitura bem-sucedida, mas bike não existe (ID inválido ou desconhecido): 404.
    if (r.ok && (r.bike === null || r.bike === undefined) && typeof window === "undefined") await markRadarNotFound();
    return r;
  },
  head: ({ params, loaderData }) => {
    const bike = validBike(loaderData);
    const idOk = BIKE_ID_RE.test(params.bikeId);
    const canonical = idOk ? `${BASE}/${encodeURIComponent(params.bikeId)}` : BASE;

    const failed = !(loaderData as { ok?: boolean } | undefined)?.ok;
    if (failed) {
      // Erro temporário: sem noindex e sem nome/preço/imagem; o status 503 sinaliza a indisponibilidade.
      return {
        meta: [
          { title: FALLBACK_TITLE },
          { name: "description", content: FALLBACK_DESCRIPTION },
          { property: "og:title", content: FALLBACK_TITLE },
          { property: "og:description", content: FALLBACK_DESCRIPTION },
          { name: "twitter:title", content: FALLBACK_TITLE },
          { name: "twitter:description", content: FALLBACK_DESCRIPTION },
          { name: "twitter:card", content: "summary_large_image" },
        ],
        links: [{ rel: "canonical", href: canonical }],
      };
    }

    if (!bike) {
      // Leitura bem-sucedida sem bike (ou ID inválido): inexistente de fato.
      return {
        meta: [
          { title: FALLBACK_TITLE },
          { name: "description", content: FALLBACK_DESCRIPTION },
          { property: "og:title", content: FALLBACK_TITLE },
          { property: "og:description", content: FALLBACK_DESCRIPTION },
          { name: "twitter:title", content: FALLBACK_TITLE },
          { name: "twitter:description", content: FALLBACK_DESCRIPTION },
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
  },
  component: AcompanhamentoBike,
});
