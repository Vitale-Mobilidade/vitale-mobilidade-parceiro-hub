import { describe, expect, it } from "vitest";
import { parseArchived } from "@/components/radar/ArchivedHistorySection";

/** Itens vindos da RPC get_price_tracker_catalog (contrato hasCurrentOffer). */
const rows = [
  { id: "v8_ultra", name: "V8 Ultra", hasCurrentOffer: true, currentPrice: 5999, link: "https://meli.la/2keMDer", observations: 12 },
  { id: "v35", name: "V35", hasCurrentOffer: false, lastObservedAt: "2026-09-10T23:36:03.335Z", lastObservedPrice: 11500, observations: 3, image: "https://cdn.exemplo/v35.webp" },
  { id: "sem_historico", name: "Sem histórico", hasCurrentOffer: false, observations: 0 },
];

describe("histórico arquivado do Radar", () => {
  it("só aceita bikes sem oferta atual e com observação registrada", () => {
    const out = parseArchived(rows);
    expect(out.map((b) => b.id)).toEqual(["v35"]);
  });

  it("nunca expõe preço atual ou link para bike arquivada", () => {
    const [v35] = parseArchived(rows);
    expect(v35.lastObservedPrice).toBe(11500);
    expect(v35.lastObservedAt).toBe("2026-09-10T23:36:03.335Z");
    expect(Object.keys(v35)).not.toContain("link");
    expect(Object.keys(v35)).not.toContain("currentPrice");
  });

  it("descarta imagem que não seja https", () => {
    const [b] = parseArchived([{ ...rows[1], image: "http://inseguro/x.png" }]);
    expect(b.image).toBeNull();
  });
});
