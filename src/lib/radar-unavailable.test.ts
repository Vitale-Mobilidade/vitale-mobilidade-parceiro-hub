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

describe("lastConfirmedDay", () => {
  const p = (date: string, verification: string, close = 100) =>
    ({ date, close, low: close, high: close, changed: false, verification, verifiedRuns: 1, lastVerifiedAt: null }) as never;

  it("usa o último dia CONFIRMADO, não o último evento de mudança", () => {
    const series = [p("2026-09-10", "observed_change", 11500), p("2026-09-22", "confirmed_unchanged", 11500)];
    expect(lastConfirmedDay(series)).toEqual({ date: "2026-09-22", close: 11500 });
  });

  it("ignora lacunas e dias reconstruídos no fim da série", () => {
    const series = [p("2026-09-20", "confirmed_unchanged", 9599), p("2026-09-21", "reconstructed"), p("2026-09-22", "missing")];
    expect(lastConfirmedDay(series)?.date).toBe("2026-09-20");
  });

  it("retorna null sem confirmação e a mensagem não inventa data", () => {
    expect(lastConfirmedDay([])).toBeNull();
    expect(unavailableMessage(null)).not.toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
