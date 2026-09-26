import { describe, expect, it } from "vitest";
import { readValues, TOOL_DEFINITIONS } from "./tools-definitions";
import { recommendScenarioPair, type MobilityBikeCandidate } from "./recommendation-engine";
import { TOOL_SLUGS } from "./tools-registry";

const cand = (id: string, price: number, autonomyKm: number | null, link = `https://meli.la/${id}`): MobilityBikeCandidate => ({
  bikeId: id, slug: id, name: id, image: null, price, link, autonomyKm, capacity: 1, monitored: false,
});

describe("definições das sete ferramentas", () => {
  it("existe uma definição por ferramenta oficial", () => {
    expect(Object.keys(TOOL_DEFINITIONS).sort()).toEqual([...TOOL_SLUGS].sort());
  });
  it("campo obrigatório vazio fica pendente e opcional vazio não vira zero implícito", () => {
    const def = TOOL_DEFINITIONS["aplicativos-vs-bike"];
    const r = readValues(def, { uber: "", ninetyNine: "100", otherApps: "", kmPerMonth: "200", daysPerWeek: "5", energyPerKm: "0.05", bikeMaintenance: "30" }, {});
    expect(r.missing).toEqual(["uber"]);
    expect(r.values.otherApps).toBeUndefined();
  });
  it("campos de financiamento só contam quando financiado", () => {
    const def = TOOL_DEFINITIONS["carro-vs-bike"];
    expect(readValues(def, {}, { financed: "nao" }).missing).not.toContain("installment");
    expect(readValues(def, {}, { financed: "sim" }).missing).toContain("installment");
  });
  it("tempo sem tempo de bike usa estimativa explícita", () => {
    const def = TOOL_DEFINITIONS["economia-de-tempo"];
    const r = def.compute({ go: 50, back: 50, daysPerWeek: 5, distance: 9, speed: 18 }, {});
    if (!r.ok) throw new Error();
    expect(r.data.note).toMatch(/18 km\/h/);
    expect(r.data.dailyKm).toBe(18);
  });
});

describe("recomendação nas ferramentas", () => {
  it("no máximo duas bikes, só com link meli.la, preço e autonomia com margem", () => {
    const list = [cand("a", 4000, 30), cand("b", 5000, 60), cand("c", 6000, 80), cand("d", 3000, null), cand("e", 2000, 90, "https://x.com/e"), cand("f", 1000, 20)];
    const r = recommendScenarioPair(list, { dailyKm: 20, needsPassenger: false, maxBudget: null });
    if (!r.ok) throw new Error();
    expect(r.bikes.map((b) => b.bikeId)).toEqual(["a", "c"]);
  });
});
