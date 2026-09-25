import { describe, expect, it } from "vitest";
import { DAILY_WINDOWS, WINDOW_LABEL, expandDaily, type DailyPoint } from "./price-daily";

const point = (date: string): DailyPoint => ({
  date,
  close: 6100,
  low: 6100,
  high: 6100,
  verifiedRuns: 1,
  lastVerifiedAt: null,
  changed: false,
  verification: "confirmed_unchanged",
});

describe("janelas públicas do histórico do Radar", () => {
  it("oferece somente 7, 14 e 30 dias ao visitante", () => {
    expect(DAILY_WINDOWS).toEqual([7, 14, 30]);
    expect(DAILY_WINDOWS.map((window) => WINDOW_LABEL[String(window)])).toEqual([
      "7 dias", "14 dias", "30 dias",
    ]);
  });

  it("recorta 14 dias inclusive, sem alterar a observação nem o suporte interno a Tudo", () => {
    const series = [point("2026-09-01"), point("2026-09-25")];
    const fortnight = expandDaily(series, 14, "2026-09-25");
    expect(fortnight).toHaveLength(14);
    expect(fortnight[0].date).toBe("2026-09-12");
    expect(fortnight[0].verification).toBe("missing");
    expect(fortnight.at(-1)).toEqual(series[1]);
    expect(expandDaily(series, "all", "2026-09-25")).toHaveLength(25);
  });
});
