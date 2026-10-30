import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchRankedTrackerSplit, fetchTrackerSplit } from "./radar-repository.server";

const catalog = [
  { id: "v9_max", name: "V9 Max", hasCurrentOffer: true, currentPrice: 6000, link: "https://meli.la/TestFixture1", observations: 2 },
  { id: "v8_pro", name: "V8 Pro", hasCurrentOffer: true, currentPrice: 6500, link: "https://meli.la/TestFixture2", observations: 2 },
  { id: "v35", name: "V35", hasCurrentOffer: false, observations: 2 },
];

function mockRpc(ranks: unknown, status = 200) {
  return vi.fn(async (url: string, init: RequestInit) => {
    expect(init.headers).toMatchObject({ apikey: "test-public-key" });
    expect(init.body).toBe("{}");
    const tracker = url.endsWith("/get_price_tracker_catalog");
    return new Response(JSON.stringify(tracker ? catalog : ranks), { status: tracker ? 200 : status });
  });
}

beforeEach(() => {
  vi.stubEnv("SUPABASE_URL", "https://db.example.test");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-public-key");
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe("leitura SSR de relevância do Radar", () => {
  it("combina catálogo e prioridade sem alterar links ou incluir arquivadas", async () => {
    const fetch = mockRpc([{ bike_id: "v9_max", relevance_rank: 1 }, { bike_id: "v8_pro", relevance_rank: 2 }]);
    vi.stubGlobal("fetch", fetch);
    const result = await fetchRankedTrackerSplit();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.relevanceAvailable).toBe(true);
    expect(result.data.active).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "v9_max", offerClickRank30d: 1, link: catalog[0].link }),
      expect.objectContaining({ id: "v8_pro", offerClickRank30d: 2, link: catalog[1].link }),
    ]));
    expect(result.data.archived).toEqual([expect.objectContaining({ id: "v35" })]);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    [null, 503],
    [[], 200],
    [[{ bike_id: "v9_max", relevance_rank: 1 }], 200],
    [[{ bike_id: "v9_max", relevance_rank: -1 }, { bike_id: "v8_pro", relevance_rank: 2 }], 200],
    [[{ bike_id: "v9_max", relevance_rank: 1 }, { bike_id: "v9_max", relevance_rank: 2 }], 200],
    [[{ bike_id: "../bad", relevance_rank: 1 }], 200],
  ])("isola ranking indisponível/incompleto/inválido (%j)", async (ranks, status) => {
    vi.stubGlobal("fetch", mockRpc(ranks, status));
    const result = await fetchRankedTrackerSplit();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.relevanceAvailable).toBe(false);
    expect(result.data.active).toHaveLength(2);
    expect(result.data.active.every((row) => (row as { offerClickRank30d: unknown }).offerClickRank30d === null)).toBe(true);
  });

  it("falha de rede de analytics preserva catálogo", async () => {
    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (!url.endsWith("/get_price_tracker_catalog")) throw new Error("network");
      return Response.json(catalog);
    }));
    const result = await fetchRankedTrackerSplit();
    expect(result.ok && result.data.relevanceAvailable).toBe(false);
    expect(result.ok && result.data.active.length).toBe(2);
  });

  it("sitemap, newsletter e outros leitores de catálogo não consultam analytics", async () => {
    const fetch = mockRpc(null);
    vi.stubGlobal("fetch", fetch);
    await fetchTrackerSplit();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toMatch(/get_price_tracker_catalog$/);
  });

  it("falha no catálogo mantém o contrato de indisponibilidade", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 503 })));
    expect(await fetchRankedTrackerSplit()).toEqual({ ok: false });
  });
});
