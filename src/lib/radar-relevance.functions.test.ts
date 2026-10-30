import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ ranked: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => ({
    handler: (handler: unknown) => handler,
    inputValidator: () => ({ handler: (handler: unknown) => handler }),
  }),
}));
vi.mock("./radar-repository.server", () => ({ fetchRankedTrackerSplit: mocks.ranked, fetchBikeHistory: vi.fn() }));

import { getHomeCards } from "./home-cards.functions";
import { getRadarCatalog } from "./radar.functions";

beforeEach(() => {
  const bike = (id: string, name: string, rank: number) => ({
    id, name, offerClickRank30d: rank, currentPrice: 6000, link: "https://meli.la/FixtureOnly", image: null,
    daily: [], minObserved: 6000, maxObserved: 6000,
  });
  mocks.ranked.mockResolvedValue({ ok: true, data: {
    active: [bike("a", "Alfa", 2), bike("z", "Zulu", 1)],
    archived: [], relevanceAvailable: true,
  } });
});

it("Home e Radar consomem a mesma leitura: prioridade vence A-Z no destaque e cards", async () => {
  const home = await getHomeCards();
  const radar = await getRadarCatalog();
  expect(home.ok).toBe(true);
  expect(radar.ok).toBe(true);
  if (!home.ok || !radar.ok) return;
  expect(home.cards.map((b) => b.id)).toEqual(["z", "a"]);
  expect(home.radar.map((b) => b.id)).toEqual(["z", "a"]);
  expect(radar.relevanceAvailable).toBe(true);
  expect(radar.bikes).toEqual(expect.arrayContaining([expect.objectContaining({ id: "z", offerClickRank30d: 1 })]));
  expect(JSON.stringify(home)).not.toContain("offerClickRank30d");
  expect(JSON.stringify(radar)).not.toContain("quiz_events");
});

it("indisponibilidade de analytics permanece explícita no loader", async () => {
  mocks.ranked.mockResolvedValue({ ok: true, data: { active: [], archived: [], relevanceAvailable: false } });
  expect(await getRadarCatalog()).toMatchObject({ ok: true, relevanceAvailable: false });
});
