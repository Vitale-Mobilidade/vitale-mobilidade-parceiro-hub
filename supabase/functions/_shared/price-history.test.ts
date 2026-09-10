import { describe, expect, it } from "vitest";
import { priceHistoryDelta, type PriceHistoryCandidate } from "./bike-sync.ts";

const c = (over: Partial<PriceHistoryCandidate> = {}): PriceHistoryCandidate => ({
  bike_id: "v9_max",
  bike_name: "V9 Max",
  price: 6472,
  link_vitale: "https://meli.la/2zwJe51",
  eligible: true,
  ...over,
});

describe("radar de preços — gravação idempotente", () => {
  it("não grava nada quando preço, link e elegibilidade seguem iguais", () => {
    const out = priceHistoryDelta([c()], [
      { bike_id: "v9_max", price: 6472, link_vitale: "https://meli.la/2zwJe51", eligible: true },
    ]);
    expect(out.rows).toHaveLength(0);
  });

  it("aceita preço vindo como texto do banco (numeric)", () => {
    const out = priceHistoryDelta([c()], [
      { bike_id: "v9_max", price: "6472.00", link_vitale: "https://meli.la/2zwJe51", eligible: true },
    ]);
    expect(out.rows).toHaveLength(0);
  });

  it("grava quando o preço muda", () => {
    const out = priceHistoryDelta([c({ price: 6300 })], [
      { bike_id: "v9_max", price: 6472, link_vitale: "https://meli.la/2zwJe51", eligible: true },
    ]);
    expect(out.rows).toHaveLength(1);
    expect(out.rows[0].price).toBe(6300);
  });

  it("grava quando o link muda", () => {
    const out = priceHistoryDelta([c({ link_vitale: "https://meli.la/novo" })], [
      { bike_id: "v9_max", price: 6472, link_vitale: "https://meli.la/2zwJe51", eligible: true },
    ]);
    expect(out.rows).toHaveLength(1);
  });

  it("grava quando a elegibilidade muda", () => {
    const out = priceHistoryDelta([c({ eligible: false })], [
      { bike_id: "v9_max", price: 6472, link_vitale: "https://meli.la/2zwJe51", eligible: true },
    ]);
    expect(out.rows).toHaveLength(1);
  });

  it("cria baseline para bike nova e ignora preço inválido", () => {
    const out = priceHistoryDelta([c({ bike_id: "nova", price: 5000 }), c({ bike_id: "ruim", price: 0 })], []);
    expect(out.rows.map((r) => r.bike_id)).toEqual(["nova"]);
    expect(out.baselines).toBe(1);
  });
});
