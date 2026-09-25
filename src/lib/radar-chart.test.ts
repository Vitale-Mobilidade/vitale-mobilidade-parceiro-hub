import { describe, expect, it } from "vitest";
import { chartEvidence, chartVariationDomain } from "./radar-chart";
import type { DailyPoint } from "./price-daily";

function point(date: string, close: number, verification: DailyPoint["verification"]): DailyPoint {
  return { date, close, low: close, high: close, verifiedRuns: 1, lastVerifiedAt: null, changed: false, verification };
}

describe("escala do histórico", () => {
  it("inclui todos os preços disponíveis, mesmo quando parte do histórico é reconstruída", () => {
    const result = chartEvidence([
      point("2026-09-01", 6100, "confirmed_unchanged"),
      point("2026-09-02", 7900, "reconstructed"),
      point("2026-09-03", 0, "missing"),
    ]);
    expect(result.domain).toEqual([0, 10000]);
  });

  it("mostra série disponível mesmo sem dia confirmado", () => {
    expect(chartEvidence([point("2026-09-01", 6100, "reconstructed")]).domain).toEqual([0, 8500]);
  });
});

describe("escala focada do destaque", () => {
  it("acompanha todos os valores de uma série variável com folga", () => {
    expect(chartVariationDomain([
      point("2026-09-01", 6100, "confirmed_unchanged"),
      point("2026-09-02", 7900, "reconstructed"),
    ])).toEqual([5800, 8200]);
  });

  it("mantém folga legível para uma série plana", () => {
    expect(chartVariationDomain([point("2026-09-01", 6100, "confirmed_unchanged")])).toEqual([5600, 6600]);
  });

  it("ignora pontos sem verificação e sem preço válido", () => {
    expect(chartVariationDomain([
      point("2026-09-01", 6100, "confirmed_unchanged"),
      point("2026-09-02", 9900, "missing"),
      point("2026-09-03", Number.NaN, "reconstructed"),
    ])).toEqual([5600, 6600]);
    expect(chartVariationDomain([point("2026-09-02", 0, "missing")])).toBeNull();
  });
});
