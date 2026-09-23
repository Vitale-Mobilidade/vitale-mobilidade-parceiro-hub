import { describe, expect, it } from "vitest";
import { buildBikeCatalog } from "./editorial-bikes";
import { buildSnapshotFromCsv } from "../../supabase/functions/_shared/bike-sheet";

// Fixture mínima: ID explícito conhecido (nome diferente), alias conhecido por nome,
// nome novo sem ID e nome novo com ID bruto novo.
const CSV = [
  "Nome,Link Vitale,Preço R$,Autonomia,Capacidade,Descrição,ID,Status",
  'Nome Comercial Qualquer,https://meli.la/abc123,"R$ 4.999,00",60 km,1 pessoa,Desc A,s8,Elegível',
  'Ouxi GT20 Pro (Panda GT20 Pro),https://meli.la/def456,"R$ 7.999,00",80 km,2 pessoas,Desc B,,Não Elegível',
  'Bike Nova X9 (Turbo),,,,1 pessoa,Desc C,,Elegível',
  'Outra Bike Inedita,,,,1 pessoa,Desc D,Modelo Z1,Elegível',
].join("\n");

describe("paridade de bikeId: editorial x writer", () => {
  it("resolve os mesmos IDs que buildSnapshotFromCsv", () => {
    const snap = buildSnapshotFromCsv(CSV);
    const writerIds = [...snap.bikes.map((b) => b.id), ...snap.pending.map((p) => p.id)].sort();
    const editorialIds = buildBikeCatalog(CSV)
      .map((b) => b.bikeId)
      .sort();
    expect(editorialIds).toEqual(writerIds);
    expect(editorialIds).toEqual(["bike_nova_x9", "modelo_z1", "ouxi_gt20_pro", "s8"]);
  });

  it("preserva inelegível, link meli.la exato e slug derivado", () => {
    const cat = buildBikeCatalog(CSV);
    const gt = cat.find((b) => b.bikeId === "ouxi_gt20_pro")!;
    expect(gt.link).toBe("https://meli.la/def456");
    expect(gt.slug).toBe("ouxi-gt20-pro");
    expect(cat.find((b) => b.bikeId === "s8")!.name).toBe("Nome Comercial Qualquer");
  });
});
