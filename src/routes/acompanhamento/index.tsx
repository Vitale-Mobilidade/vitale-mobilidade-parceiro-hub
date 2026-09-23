import { createFileRoute } from "@tanstack/react-router";
import Acompanhamento from "@/pages/Acompanhamento";
import { getRadarCatalog, RADAR_UNAVAILABLE_HEADERS } from "@/lib/radar.functions";

const URL = "https://vitalemobilidade.com/acompanhamento";
const TITLE = "Radar de Preços de Bikes Elétricas | Vitale Mobilidade";
const DESCRIPTION =
  "Veja se hoje é um bom momento para comprar sua bike elétrica: compare o preço atual com o histórico real registrado pela Vitale.";
const OG_TITLE = "Veja se hoje é um bom momento para comprar sua bike";
const OG_DESCRIPTION =
  "Compare o preço atual com o histórico e acompanhe as melhores oportunidades de bikes elétricas.";

export const Route = createFileRoute("/acompanhamento/")({
  loader: async () => {
    const r = await getRadarCatalog();
    return r;
  },
  // Falha temporária: marcador + Retry-After/no-store; src/server.ts troca o status para 503.
  headers: ({ loaderData }) =>
    loaderData && loaderData.ok === false ? RADAR_UNAVAILABLE_HEADERS : undefined,
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { property: "og:title", content: OG_TITLE },
      { property: "og:description", content: OG_DESCRIPTION },
      { property: "og:url", content: URL },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: OG_TITLE },
      { name: "twitter:description", content: OG_DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: Acompanhamento,
});
