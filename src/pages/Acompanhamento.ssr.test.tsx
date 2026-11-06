import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { supabase } from "@/integrations/supabase/client";
import type { RadarCatalogData } from "@/lib/radar-routes";
import Acompanhamento from "./Acompanhamento";

const routing = vi.hoisted(() => ({ location: { searchStr: "" } }));
afterEach(() => {
  routing.location.searchStr = "";
});
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => () => {},
  useRouterState: ({
    select,
  }: {
    select: (state: typeof routing) => unknown;
  }) => select(routing),
  Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
}));
vi.mock("@/lib/router-compat", () => ({
  useNavigate: () => () => {},
  Link: ({ to, children }: { to: string; children: ReactNode }) => (
    <a href={to}>{children}</a>
  ),
}));
vi.mock("@/lib/radar-base", () => ({ useRadarBase: () => "/radar" }));
vi.mock("@/components/site/site-ui", () => ({
  SiteHeader: () => null,
  SiteFooter: () => null,
  SectionHeading: ({ title }: { title: string }) => <h2>{title}</h2>,
  BikeMedia: () => null,
}));
const initial = {
  ok: true,
  relevanceAvailable: false,
  catalog: [],
  videos: [],
  archived: [],
  bikes: [
    {
      id: "v9_max",
      name: "V9 Max",
      currentPrice: 6174,
      link: "https://meli.la/fixture",
      image: null,
      daily: [],
      observations: 1,
      minObserved: 6174,
      maxObserved: 6174,
      firstObservedAt: null,
      lastObservedAt: null,
    },
  ],
} as unknown as RadarCatalogData;
it("renders public catalog and both actions in SSR without fetching private session or favorites", () => {
  const html = renderToStaticMarkup(<Acompanhamento initial={initial} />);
  expect(html).toContain('href="/radar/v9_max"');
  expect(html).toContain('aria-label="Favoritar: V9 Max"');
  expect(html).toContain('aria-label="Cadastrar alerta de preço para V9 Max"');
  expect(html).toContain("6.174");
  expect(supabase.rpc).not.toHaveBeenCalled();
  expect(supabase.auth.getSession).not.toHaveBeenCalled();
});

it("renders a loading state for the favorite view without leaking public cards as saved items", () => {
  routing.location.searchStr = "?favoritos=1";
  const html = renderToStaticMarkup(<Acompanhamento initial={initial} />);
  expect(html).toContain("Bikes favoritas");
  expect(html).toContain("Carregando suas bikes favoritas");
  expect(html).not.toContain('aria-label="Favoritar: V9 Max"');
  expect(html).not.toContain("Nenhuma bike favoritada");
  expect(supabase.rpc).not.toHaveBeenCalled();
});
