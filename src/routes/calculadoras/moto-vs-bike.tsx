import { createFileRoute } from "@tanstack/react-router";
import { VehicleVsBikeCalculator, type VehicleCopy } from "@/components/mobility/VehicleVsBikeCalculator";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import type { MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { canonicalUrl, pageHead } from "@/lib/seo";

const TITLE = "Moto ou bike elétrica: quanto custa cada um no trajeto? | Vitale Mobilidade";
const DESCRIPTION =
  "Compare o gasto variável da moto no trajeto com o custo de uma bike elétrica real: economia líquida estimada, payback e custo acumulado em 12, 24 e 36 meses.";

export const Route = createFileRoute("/calculadoras/moto-vs-bike")({
  loader: () =>
    getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      robots: "noindex, follow",
      path: "/calculadoras/moto-vs-bike",
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Moto ou bike elétrica: quanto custa cada um no trajeto?",
      ogDescription: "Compare o gasto da moto no trajeto com bikes reais com oferta atual, sem cadastro.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora moto vs bike elétrica",
            url: canonicalUrl("/calculadoras/moto-vs-bike"),
            applicationCategory: "FinanceApplication",
            operatingSystem: "Web",
            inLanguage: "pt-BR",
            isAccessibleForFree: true,
            offers: { "@type": "Offer", price: "0", priceCurrency: "BRL" },
            publisher: { "@type": "Organization", name: "Vitale Mobilidade" },
          }),
        },
      ],
    };
  },
  component: CalculadoraMotoVsBike,
});


const COPY: VehicleCopy = {
  vehicle: "moto",
  eyebrow: "MOTO VS BIKE",
  h1: "Moto ou bike elétrica: quanto custa cada um no trajeto?",
  intro: "Informe o gasto variável da moto nesses trajetos e sua rotina. A comparação com até duas bikes reais aparece na hora, sem cadastro.",
  noun: "moto",
  withArticle: "a moto",
  ofArticle: "da moto",
  methodTitle: "Moto vs bike",
  position: "calculadora_moto_vs_bike",
};

function CalculadoraMotoVsBike() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  return <VehicleVsBikeCalculator sourceOk={sourceOk} candidates={candidates} copy={COPY} />;
}
