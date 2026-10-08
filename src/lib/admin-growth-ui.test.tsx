import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Growth } from "@/pages/AdminEditorial";
import type { AdminGrowth } from "./admin-api";

const data: AdminGrowth = {
  rangeDays: 30,
  generatedAt: "2026-10-08T18:00:00Z",
  funnel: {
    since: "2026-09-08T00:00:00Z",
    coverageSince: "2026-09-26T00:00:00Z",
    abandonAfterMinutes: 30,
    pageVisitors: 100,
    started: 80,
    leadFormReached: 50,
    completed: 40,
    introAbandoned: 20,
    leadFormAbandoned: 10,
    steps: [80, 75, 70, 65, 60, 55, 50].map((reached, index) => ({
      step: index + 1,
      reached,
      advanced: [75, 70, 65, 60, 55, 50, 50][index],
      abandoned: [5, 5, 5, 5, 5, 5, 0][index],
    })),
    rates: {
      startRate: 0.8,
      formRate: 0.625,
      completionRate: 0.5,
      formToCompletion: 0.8,
    },
    uniqueLeads: 40,
    purchaseClicks: 9,
    identifiedClickers: 7,
  },
  quizBikesAvailable: true,
  quizBikesStatus: "active",
  quizBikes: [
    {
      bikeId: "v8_ultra",
      name: "V8 Ultra",
      primaryRecommendations: 12,
      secondaryRecommendations: 5,
      quizOfferClicks: 4,
    },
  ],
  sitewide: {
    available: true,
    status: "active",
    coverageSince: "2026-10-08",
    pageViews: 300,
    bikeClicks: 20,
    affiliateClicks: 8,
    pages: [
      { path: "/", views: 120 },
      { path: "/radar", views: 90 },
      { path: "/quiz", views: 30 },
    ],
    bikes: [
      {
        bikeId: "v8_ultra",
        name: "V8 Ultra",
        detailClicks: 10,
        offerClicks: 4,
        origins: [{ path: "/conteudos/guia", detailClicks: 6, offerClicks: 2 }],
      },
    ],
  },
  coverage: {
    quizFunnelSince: "2026-09-26T00:00:00Z",
    sitewidePageViews: "first_party_daily",
    sitewideAffiliateClicks: "first_party_daily",
    quizClicks: "quiz_events",
  },
};

describe("Admin Growth v2 UI", () => {
  it("expõe funil comercial, recomendações e drill-down por bike sem PII", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(["admin", "growth", 30], data);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Growth />
      </QueryClientProvider>,
    );
    expect(html).toContain("Conversão global do Quiz");
    expect(html).toContain("40.0%");
    expect(html).toContain("Pergunta 7 · Experiência com bike elétrica");
    expect(html).toContain("Bikes recomendadas pelo Quiz");
    expect(html).toContain("Interesse nas bikes em todo o site");
    expect(html).toContain("Rotas públicas com mais visualizações");
    expect(html).toContain("Cobertura do top 20");
    expect(html).toContain("Página inicial");
    expect(html).toContain("40.0%");
    expect(html).toContain("3 de até 20 rotas exibidas");
    expect(html).not.toContain('href="/radar"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toMatch(/private@example|Guilherme|\+55\s?11/i);
  });

  it("distingue fonte de cliques indisponível de zero observado", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(["admin", "growth", 30], {
      ...data,
      quizBikesAvailable: false,
      quizBikesStatus: "unavailable",
      quizBikes: [],
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Growth />
      </QueryClientProvider>,
    );
    expect(html).toContain("Fonte indisponível");
    expect(html).toContain("fonte agregada de recomendações está indisponível");
  });
});
