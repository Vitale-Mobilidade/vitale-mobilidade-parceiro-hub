import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import type { RadarCatalogData } from "@/lib/radar-routes";

vi.stubGlobal("React", React);
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children }: { to: string; children: React.ReactNode }) => React.createElement("a", { href: to }, children),
}));
vi.mock("@/lib/radar-base", () => ({ useRadarBase: () => "/radar" }));
vi.mock("@/components/site/site-ui", () => ({
  SiteHeader: () => null, SiteFooter: () => null, BikeMedia: () => null,
  SectionHeading: ({ id, title }: { id: string; title: string }) => React.createElement("h2", { id }, title),
}));
vi.mock("@/components/radar/DailyPriceChart", () => ({ DailyPriceChart: () => null }));
vi.mock("@/components/radar/BikeSearchCombobox", () => ({ BikeSearchCombobox: () => null }));
vi.mock("@/components/radar/RadarBikeCard", () => ({
  RadarBikeCard: ({ entry }: { entry: { id: string } }) => React.createElement("article", { "data-bike": entry.id }),
}));
vi.mock("@/components/radar/ArchivedHistorySection", () => ({ ArchivedHistorySection: () => null, parseArchived: () => [] }));

import Acompanhamento from "./Acompanhamento";

function initial(available: boolean): RadarCatalogData {
  return {
    ok: true, relevanceAvailable: available, catalog: [], videos: [], archived: [],
    bikes: [
      { id: "a", name: "Alfa", offerClickRank30d: available ? 2 : null },
      { id: "z", name: "Zulu", offerClickRank30d: available ? 1 : null },
    ].map((b) => ({ ...b, currentPrice: 6000, link: "https://meli.la/FixtureOnly", image: null,
      daily: [], observations: 1, firstObservedAt: null, lastObservedAt: null, minObserved: 6000, maxObserved: 6000 })),
  };
}

it("SSR já entrega catálogo e destaque na ordem de cliques com explicação acessível", () => {
  const html = renderToStaticMarkup(<Acompanhamento initial={initial(true)} />);
  expect(html.indexOf('data-bike="z"')).toBeLessThan(html.indexOf('data-bike="a"'));
  expect(html).toContain('aria-describedby="radar-sort-help"');
  expect(html).toContain("bikes com mais cliques para ofertas nos últimos 30 dias");
  expect(html).toContain("Destaque do Radar");
  expect(html.indexOf("Zulu")).toBeLessThan(html.indexOf("Alfa"));
});

it("falha de ranking preserva catálogo A-Z, explica fallback e não inventa destaque", () => {
  const html = renderToStaticMarkup(<Acompanhamento initial={initial(false)} />);
  expect(html.indexOf('data-bike="a"')).toBeLessThan(html.indexOf('data-bike="z"'));
  expect(html).toContain("A ordenação por cliques está indisponível");
  expect(html).not.toContain("Destaque do Radar");
});
