import { describe, expect, it } from "vitest";
import { lastRealIndex, unavailableMessage } from "./radar-unavailable";
import type { DailyPoint } from "./price-daily";

const day = (date: string, verification: DailyPoint["verification"], close = 1000): DailyPoint => ({
  date,
  close,
  low: close,
  high: close,
  verifiedRuns: 1,
  lastVerifiedAt: null,
  changed: false,
  verification,
});

describe("radar-unavailable", () => {
  it("usa a data civil literal na mensagem", () => {
    expect(unavailableMessage("2026-08-27")).toBe(
      "Sem oferta disponível no Mercado Livre no momento. Este é o último preço registrado pela Vitale em 27/08/2026; pode não ser o preço de hoje.",
    );
  });

  it("não inventa data quando não há", () => {
    expect(unavailableMessage(null)).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });

  it("ignora lacunas ao achar o ponto mais recente com preço real", () => {
    const series = [
      day("2026-08-27", "observed_change"),
      day("2026-08-28", "reconstructed"),
      day("2026-08-29", "missing"),
    ];
    expect(lastRealIndex(series)).toBe(1);
    expect(lastRealIndex([day("2026-08-29", "missing")])).toBe(-1);
    expect(lastRealIndex([])).toBe(-1);
  });
});
