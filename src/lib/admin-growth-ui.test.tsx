import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Growth } from "@/pages/AdminEditorial";
import { PublicTrafficChart } from "@/components/admin/PublicTrafficChart";
import { TrafficPeakMap } from "@/components/admin/TrafficPeakMap";
import type { AdminGrowth } from "./admin-api";

const data: AdminGrowth = {
  rangeDays: 7,
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
    pageClicks: [
      { path: "/conteudos/guia", views: 50, detailClicks: 6, offerClicks: 2 },
    ],
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
    client.setQueryData(["admin", "growth", 7], data);
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
    expect(html).toContain("Quais páginas geram cliques em ofertas?");
    expect(html).toContain("/conteudos/guia");
    expect(html).toContain("4.0 cliques em oferta a cada 100 visualizações");
    expect(html).toContain("Hoje");
    expect(html).toContain("Ontem");
    expect(html).toContain("Personalizado");
    expect(html).not.toContain("<table");
    expect(html).toContain("Página inicial");
    expect(html).toContain("40.0%");
    expect(html).toContain("Não é conversão");
    expect(html).not.toContain('href="/radar"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).not.toMatch(/private@example|Guilherme|\+55\s?11/i);
  });

  it("distingue fonte de cliques indisponível de zero observado", () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    client.setQueryData(["admin", "growth", 7], {
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
  it("does not infer missing page origins from traffic or show unavailable as zero", () => {
    const client = new QueryClient();
    client.setQueryData(["admin", "growth", 7], {
      ...data,
      sitewide: { ...data.sitewide, pageClicks: undefined },
    });
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Growth />
      </QueryClientProvider>,
    );
    expect(html).toContain("Origem por página indisponível");
    expect(html).toContain("Abandono confirmado");
    expect(html).toContain("progresso observado até esta consulta");
  });
  it("keeps every stage conversion and loss visible without hover or disclosure", () => {
    const client = new QueryClient();
    client.setQueryData(["admin", "growth", 7], data);
    const html = renderToStaticMarkup(
      <QueryClientProvider client={client}>
        <Growth />
      </QueryClientProvider>,
    );
    const funnel = html
      .slice(
        html.indexOf("Funil do Quiz por etapa"),
        html.indexOf("Como ler o funil e a cobertura"),
      )
      .replace(/ title="[^"]*"/g, "")
      .replace(/<span class="sr-only">[\s\S]*?<\/span>/g, "");
    expect(funnel).toContain("Avançaram");
    expect(funnel).toContain("Perda");
    // These rates must come from the previous stage, not the page entry base.
    for (const rate of [
      "80.0%",
      "93.8%",
      "93.3%",
      "92.9%",
      "92.3%",
      "91.7%",
      "90.9%",
      "100.0%",
    ]) {
      expect(funnel).toContain(`>${rate}</strong>`);
    }
    expect(funnel).toContain(">20</span>");
    expect(funnel).toContain(">10</span>");
  });
});

describe("Public traffic comparison", () => {
  it("shows both periods and excludes today and its matching day from the change", () => {
    const html = renderToStaticMarkup(
      <PublicTrafficChart
        generatedAt="2026-10-09T01:30:00Z"
        traffic={{
          coverageSince: "2026-10-05",
          days: [
            { date: "2026-10-07", views: 120, previousDate: "2026-10-05", previousViews: 100 },
            { date: "2026-10-08", views: 5, previousDate: "2026-10-06", previousViews: 110 },
          ],
        }}
      />,
    );
    expect(html).toContain("Visualizações públicas por dia");
    expect(html).toContain("07/10/2026 a 08/10/2026");
    expect(html).toContain("05/10/2026 a 06/10/2026");
    expect(html).toContain("hoje parcial");
    expect(html).toContain("+20%");
    expect(html).toContain("Ver valores por dia");
  });

  it("distinguishes unavailable analytics, missing history and a measured zero", () => {
    const generatedAt = "2026-10-09T12:00:00Z";
    const day = { date: "2026-10-07", views: null, previousDate: "2026-10-06", previousViews: null };
    expect(renderToStaticMarkup(<PublicTrafficChart generatedAt={generatedAt} traffic={null} />))
      .toContain("temporariamente indisponível");
    expect(renderToStaticMarkup(<PublicTrafficChart generatedAt={generatedAt} traffic={{ coverageSince: null, days: [day] }} />))
      .toContain("Sem histórico");
    const zero = renderToStaticMarkup(
      <PublicTrafficChart generatedAt={generatedAt}
        traffic={{ coverageSince: day.previousDate, days: [{ ...day, views: 7, previousViews: 0 }] }}
      />,
    );
    expect(zero).toContain("Sem visualizações na base anterior");
    expect(zero).toContain(">0<");
  });
});

describe("Hourly public traffic", () => {
  it("calculates a long-range change only from matching covered days", () => {
    const html = renderToStaticMarkup(
      <PublicTrafficChart generatedAt="2026-11-13T12:00:00Z"
        traffic={{ coverageSince: "2026-10-08", days: [
          { date: "2026-11-10", views: 10000, previousDate: "2026-11-07", previousViews: null },
          { date: "2026-11-11", views: 150, previousDate: "2026-11-08", previousViews: 100 },
          { date: "2026-11-12", views: 90, previousDate: "2026-11-09", previousViews: 100 },
        ] }}
      />,
    );
    expect(html).toContain("2 de 3 dias fechados com dados nos dois períodos");
    expect(html).toContain("+20%");
    expect(html).toContain("+50%");
  });

  it("compares only equivalent closed hours today and displays covered heatmap cells", () => {
    const trafficHours = {
      coverageSince: "2026-11-01T10:00:00", currentHour: "2026-11-13T09:00:00",
      hours: [
        { hour: 8, views: 30, previousViews: 20 },
        { hour: 9, views: 5, previousViews: 20 },
        { hour: 10, views: null, previousViews: 18 },
      ],
      heatmap: [{ weekday: 5, hour: 8, average: 30, samples: 1 }],
    };
    const html = renderToStaticMarkup(
      <PublicTrafficChart generatedAt="2026-11-13T12:30:00Z" trafficHours={trafficHours}
        traffic={{ coverageSince: "2026-10-08", days: [
          { date: "2026-11-13", views: 35, previousDate: "2026-11-12", previousViews: 100 },
        ] }}
      />,
    );
    expect(html).toContain("Visualizações públicas por hora");
    expect(html).toContain("+50%");
    expect(html).toContain("1 de 1 horas fechadas comparadas");
    expect(html).not.toContain("-75%");
    const heatmap = renderToStaticMarkup(<TrafficPeakMap traffic={trafficHours} day="2026-11-13" />);
    expect(heatmap).toContain("Mapa de calor de acessos");
    expect(heatmap).toContain("30 visualizações · 1 ocorrência");
    expect(heatmap).toContain("Sem cobertura");
  });
});
