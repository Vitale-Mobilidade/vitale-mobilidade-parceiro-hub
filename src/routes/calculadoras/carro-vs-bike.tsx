import { createFileRoute } from "@tanstack/react-router";
import { VehicleVsBikeCalculator, type VehicleCopy } from "@/components/mobility/VehicleVsBikeCalculator";
import { getMobilityBikeCandidates } from "@/lib/mobility-bikes.functions";
import type { MobilityBikeCandidate } from "@/lib/mobility/recommendation-engine";
import { canonicalUrl, pageHead } from "@/lib/seo";

const TITLE = "Carro ou bike elétrica: quanto custa cada um no trajeto? | Vitale Mobilidade";
const DESCRIPTION =
  "Compare o gasto variável do carro no trajeto com o custo de uma bike elétrica real: economia líquida estimada, payback e custo acumulado em 12, 24 e 36 meses.";

export const Route = createFileRoute("/calculadoras/carro-vs-bike")({
  loader: () =>
    getMobilityBikeCandidates().catch(() => ({ ok: false, candidates: [] as MobilityBikeCandidate[] })),
  head: () => {
    const base = pageHead({
      robots: "noindex, follow",
      path: "/calculadoras/carro-vs-bike",
      title: TITLE,
      description: DESCRIPTION,
      ogTitle: "Carro ou bike elétrica: quanto custa cada um no trajeto?",
      ogDescription: "Compare o gasto do carro no trajeto com bikes reais com oferta atual, sem cadastro.",
    });
    return {
      ...base,
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "Calculadora carro vs bike elétrica",
            url: canonicalUrl("/calculadoras/carro-vs-bike"),
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
  component: CalculadoraCarroVsBike,
});


const COPY: VehicleCopy = {
  vehicle: "carro",
  eyebrow: "CARRO VS BIKE",
  h1: "Carro ou bike elétrica: quanto custa cada um no trajeto?",
  intro: "Informe o gasto variável do carro nesses trajetos e sua rotina. A comparação com até duas bikes reais aparece na hora, sem cadastro.",
  noun: "carro",
  withArticle: "o carro",
  ofArticle: "do carro",
  methodTitle: "Carro vs bike",
  position: "calculadora_carro_vs_bike",
};

function CalculadoraCarroVsBike() {
  const { ok: sourceOk, candidates } = Route.useLoaderData();
  return <VehicleVsBikeCalculator sourceOk={sourceOk} candidates={candidates} copy={COPY} />;
}
