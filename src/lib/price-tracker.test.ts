import { describe, expect, it } from "vitest";
import {
  buildTrackerEntries,
  classifyPrice,
  clampWindow,
  computeStats,
  isSafePurchaseLink,
  timeWeightedTypicalPrice,
  type PricePoint,
  type TrackerBike,
} from "./price-tracker";

const NOW = new Date("2026-09-10T12:00:00.000Z");
const day = (n: number) => new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function bike(partial: Partial<TrackerBike> & { points: PricePoint[]; currentPrice: number }): TrackerBike {
  return {
    id: "b1",
    name: "Bike 1",
    link: "https://meli.la/abc123",
    image: null,
    firstObservedAt: partial.points[0]?.t ?? null,
    lastObservedAt: partial.points[partial.points.length - 1]?.t ?? null,
    observations: partial.points.length,
    minObserved: null,
    maxObserved: null,
    ...partial,
  } as TrackerBike;
}

describe("preço típico ponderado pelo tempo", () => {
  it("pondera pela vigência e não pela quantidade de eventos", () => {
    // 1000 vigente por 29 dias, 2000 vigente por 1 dia.
    const points = [
      { t: day(30), price: 1000 },
      { t: day(1), price: 2000 },
    ];
    const typical = timeWeightedTypicalPrice(points, 30, NOW)!;
    expect(Math.round(typical)).toBe(1033); // média simples seria 1500
  });

  it("usa o preço vigente antes da janela como âncora", () => {
    const points = [{ t: day(60), price: 5000 }];
    expect(timeWeightedTypicalPrice(points, 7, NOW)).toBe(5000);
  });

  it("retorna null sem dados", () => {
    expect(timeWeightedTypicalPrice([], 30, NOW)).toBeNull();
  });
});

describe("classificação conservadora", () => {
  const base = { currentPrice: 1000, typicalPrice: 1000, minObserved: 900, daysTracked: 40, distinctPrices: 3 };

  it("histórico em formação com menos de 14 dias", () => {
    expect(classifyPrice({ ...base, daysTracked: 10 })).toBe("forming");
  });

  it("histórico em formação com menos de 2 preços distintos", () => {
    expect(classifyPrice({ ...base, distinctPrices: 1 })).toBe("forming");
  });

  it("menor preço observado", () => {
    expect(classifyPrice({ ...base, currentPrice: 900 })).toBe("lowest");
  });

  it("bom preço a 5% abaixo do típico", () => {
    expect(classifyPrice({ ...base, currentPrice: 950 })).toBe("good");
  });

  it("na faixa típica dentro de ±5%", () => {
    expect(classifyPrice({ ...base, currentPrice: 1040 })).toBe("typical");
    expect(classifyPrice({ ...base, currentPrice: 960 })).toBe("typical");
  });

  it("acima do histórico além de +5%", () => {
    expect(classifyPrice({ ...base, currentPrice: 1100 })).toBe("above");
  });
});

describe("computeStats", () => {
  it("calcula preço anterior, delta e mínimos reais", () => {
    const b = bike({
      currentPrice: 6000,
      points: [
        { t: day(40), price: 6500 },
        { t: day(20), price: 5800 },
        { t: day(5), price: 6000 },
      ],
    });
    const s = computeStats(b, 90, NOW);
    expect(s.previousPrice).toBe(5800);
    expect(s.deltaAbs).toBe(200);
    expect(Math.round(s.deltaPct!)).toBe(3);
    expect(s.minObserved).toBe(5800);
    expect(s.maxObserved).toBe(6500);
    expect(s.distinctPrices).toBe(3);
    expect(s.classification).not.toBe("forming");
  });

  it("marca histórico em formação para bike recém-incluída", () => {
    const b = bike({ currentPrice: 7000, points: [{ t: day(2), price: 7000 }] });
    const s = computeStats(b, 30, NOW);
    expect(s.classification).toBe("forming");
    expect(s.previousPrice).toBeNull();
  });

  it("limita a série à janela escolhida", () => {
    const b = bike({
      currentPrice: 100,
      points: [
        { t: day(80), price: 120 },
        { t: day(3), price: 100 },
      ],
    });
    expect(computeStats(b, 7, NOW).series).toHaveLength(1);
    expect(computeStats(b, 90, NOW).series).toHaveLength(2);
  });
});

describe("catálogo público", () => {
  it("aceita apenas links https completos", () => {
    expect(isSafePurchaseLink("https://meli.la/abc")).toBe(true);
    expect(isSafePurchaseLink("meli.la/abc")).toBe(false);
    expect(isSafePurchaseLink("http://meli.la/abc")).toBe(false);
    expect(isSafePurchaseLink(null)).toBe(false);
  });

  it("descarta bikes sem link https completo ou sem preço e ordena A-Z", () => {
    const entries = buildTrackerEntries(
      [
        bike({ id: "z", name: "Zeta", currentPrice: 100, points: [{ t: day(1), price: 100 }] }),
        bike({ id: "a", name: "Álfa", currentPrice: 100, points: [{ t: day(1), price: 100 }] }),
        { ...bike({ id: "x", name: "Sem link", currentPrice: 100, points: [] }), link: "meli.la/x" },
        { ...bike({ id: "y", name: "Sem preço", currentPrice: 0, points: [] }) },
      ] as TrackerBike[],
      30,
      NOW,
    );
    expect(entries.map((e) => e.id)).toEqual(["a", "z"]);
  });

  it("clampWindow aceita somente 7/30/90", () => {
    expect(clampWindow(1)).toBe(7);
    expect(clampWindow(30)).toBe(30);
    expect(clampWindow(365)).toBe(90);
  });
});

describe("contrato do catálogo: métricas globais x pontos da janela", () => {
  // A RPC devolve points limitados à janela de 90 dias + âncora, mas
  // minObserved/maxObserved/first/last/observations vêm de TODO o histórico.
  const payload: TrackerBike = {
    id: "v9_max",
    name: "V9 Max",
    link: "https://meli.la/abc123",
    image: null,
    currentPrice: 6500,
    // Mínimo real de 200 dias atrás NÃO aparece nos pontos.
    points: [
      { t: day(150), price: 6800, source: "sync" }, // âncora anterior à janela
      { t: day(40), price: 6500, source: "sync" },
    ],
    firstObservedAt: day(200),
    lastObservedAt: day(40),
    observations: 9,
    minObserved: 5900,
    maxObserved: 7200,
  };

  it("preserva o mínimo histórico com mais de 120 dias", () => {
    const s = computeStats(payload, 90, NOW);
    expect(s.minObserved).toBe(5900);
    expect(s.maxObserved).toBe(7200);
    expect(s.observations).toBe(9);
    expect(s.firstObservedAt).toBe(day(200));
    expect(s.daysTracked).toBeGreaterThan(120);
  });

  it("mantém a série limitada à janela, usando a âncora para o preço vigente", () => {
    const s = computeStats(payload, 90, NOW);
    expect(s.series.map((p) => p.price)).toEqual([6500]);
    // A âncora de 150 dias sustenta o preço vigente no início da janela.
    const typical = s.typicalPrice!;
    expect(typical).toBeGreaterThan(6500);
    expect(typical).toBeLessThan(6800);
  });

  it("não classifica como menor preço quando o mínimo histórico é menor", () => {
    expect(computeStats(payload, 90, NOW).classification).not.toBe("lowest");
  });
});

