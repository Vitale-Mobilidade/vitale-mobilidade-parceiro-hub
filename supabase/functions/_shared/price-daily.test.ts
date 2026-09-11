import { describe, expect, it } from "vitest";
import { buildDailyRows, saoPauloDay } from "./price-daily.ts";

const at = new Date("2026-09-11T02:07:00.000Z"); // 10/09 23:07 em São Paulo

describe("fechamento diário do radar", () => {
  it("usa o dia de São Paulo", () => {
    expect(saoPauloDay(at)).toBe("2026-09-10");
  });

  it("confirma preço sem mudança quando não houve evento", () => {
    const rows = buildDailyRows([{ bike_id: "v9", price: 6472, changed: false }], [], at);
    expect(rows).toHaveLength(1);
    expect(rows[0].verification).toBe("confirmed_unchanged");
    expect(rows[0].verified_runs).toBe(1);
    expect(rows[0].low).toBe(6472);
  });

  it("acumula mínima, máxima e verificações no mesmo dia", () => {
    const rows = buildDailyRows(
      [{ bike_id: "v9", price: 6300, changed: true }],
      [{ bike_id: "v9", day: "2026-09-10", low: "6472", high: "6472", verified_runs: 3, changed: false }],
      at,
    );
    expect(rows[0].low).toBe(6300);
    expect(rows[0].high).toBe(6472);
    expect(rows[0].verified_runs).toBe(4);
    expect(rows[0].verification).toBe("observed_change");
  });

  it("ignora preço inválido", () => {
    expect(buildDailyRows([{ bike_id: "x", price: 0, changed: false }], [], at)).toHaveLength(0);
  });
});
