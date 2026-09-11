import { describe, expect, it } from "vitest";
import { dailyMetrics, expandDaily, normalizeText, type DailyPoint } from "./price-daily";
import {
  buildHighlights,
  buildRadarEntries,
  buildSummary,
  matchesChips,
  searchEntries,
  sortEntries,
  type RadarBike,
} from "./radar-rankings";

const TODAY = "2026-09-10";

function day(date: string, close: number, verification: DailyPoint["verification"] = "confirmed_unchanged"): DailyPoint {
  return {
    date,
    close,
    low: close,
    high: close,
    verifiedRuns: 24,
    lastVerifiedAt: `${date}T23:07:00.000Z`,
    changed: verification === "observed_change",
    verification,
  };
}

/** 30 dias verificados terminando em TODAY. */
function makeSeries(prices: number[]): DailyPoint[] {
  const start = new Date(`${TODAY}T12:00:00Z`).getTime() - (prices.length - 1) * 86400000;
  return prices.map((p, i) =>
    day(new Date(start + i * 86400000).toISOString().slice(0, 10), p, i > 0 && p !== prices[i - 1] ? "observed_change" : "confirmed_unchanged"),
  );
}

function bike(over: Partial<RadarBike> = {}): RadarBike {
  const daily = over.daily ?? makeSeries(Array(20).fill(7000).concat(Array(10).fill(6000)));
  const closes = daily.map((d) => d.close);
  return {
    id: "b1",
    name: "Bike Teste",
    currentPrice: closes[closes.length - 1],
    link: "https://meli.la/abc",
    image: null,
    daily,
    firstObservedAt: `${daily[0].date}T12:00:00Z`,
    lastObservedAt: `${TODAY}T12:00:00Z`,
    observations: 2,
    minObserved: Math.min(...closes),
    maxObserved: Math.max(...closes),
    ...over,
  };
}

describe("série diária", () => {
  it("marca lacuna quando um dia não teve verificação", () => {
    const series = [day("2026-09-05", 7000), day("2026-09-07", 7000)];
    const out = expandDaily(series, "all", "2026-09-07");
    expect(out.map((p) => p.verification)).toEqual(["confirmed_unchanged", "missing", "confirmed_unchanged"]);
  });

  it("classifica como histórico em formação com cobertura baixa", () => {
    const series = [day("2026-08-20", 7000), day("2026-09-10", 6500)];
    const m = dailyMetrics({ daily: series, currentPrice: 6500 }, "all", TODAY);
    expect(m.classification).toBe("forming");
    expect(m.coverage).toBeLessThan(0.8);
  });

  it("usa mediana e faixa P25–P75 dos fechamentos diários", () => {
    const m = dailyMetrics({ daily: makeSeries(Array(20).fill(7000).concat(Array(10).fill(6000))), currentPrice: 6000 }, "all", TODAY);
    expect(m.typicalPrice).toBe(7000);
    expect(m.p25).toBe(6000);
    expect(m.p75).toBe(7000);
    expect(m.classification).toBe("lowest");
    expect(m.verifiedDays).toBe(30);
    expect(m.coverage).toBe(1);
  });
});

describe("rankings do radar", () => {
  const entries = buildRadarEntries(
    [
      bike(),
      bike({ id: "b2", name: "Álfa Urbana", daily: makeSeries(Array(25).fill(4000).concat(Array(5).fill(3800))), minObserved: 3800, maxObserved: 4000 }),
      bike({ id: "b3", name: "Sem histórico", daily: [day("2026-09-09", 9000)], minObserved: 9000, maxObserved: 9000 }),
    ],
    "all",
    TODAY,
  );

  it("filtra apenas links https do catálogo", () => {
    const out = buildRadarEntries([bike({ id: "ruim", link: "http://inseguro" })], "all", TODAY);
    expect(out).toHaveLength(0);
  });

  it("ordena por menor preço e A–Z", () => {
    expect(sortEntries(entries, "price")[0].id).toBe("b2");
    expect(sortEntries(entries, "name")[0].name).toBe("Álfa Urbana");
  });

  it("ordena maior queda pelo percentual contra o preço anterior", () => {
    const top = sortEntries(entries, "drop")[0];
    expect(top.dropPct).toBeLessThan(0);
  });

  it("busca ignora acento e caixa", () => {
    expect(normalizeText("Álfa")).toBe("alfa");
    expect(searchEntries(entries, "alfa").map((e) => e.id)).toEqual(["b2"]);
  });

  it("chips filtram menor preço e queda recente", () => {
    const lowest = entries.filter((e) => matchesChips(e, ["lowest"]));
    expect(lowest.length).toBeGreaterThan(0);
    expect(entries.filter((e) => matchesChips(e, ["over_8k"])).map((e) => e.id)).toEqual(["b3"]);
  });

  it("destaques nunca usam bike sem histórico suficiente", () => {
    const h = buildHighlights(entries);
    const all = [...h.bestPrices, ...h.biggestDrops, ...h.nearMin];
    expect(all.some((e) => e.id === "b3")).toBe(false);
  });

  it("resumo conta bikes e menor preço", () => {
    const s = buildSummary(entries);
    expect(s.tracked).toBe(3);
    expect(s.atLowest).toBeGreaterThan(0);
    expect(s.biggestDropPct).toBeLessThan(0);
  });
});
