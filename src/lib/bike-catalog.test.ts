import { describe, expect, it } from "vitest";
import {
  buildShortDescription,
  buildSnapshotFromCsv,
  normalizeName,
  parseAutonomyKm,
  parseBrlPrice,
  parseCapacity,
  parseVitaleLink,
  resolveBikeId,
  snapshotHash,
} from "../../supabase/functions/_shared/bike-sheet";
import { mergeCatalog, tierForPrice } from "./bike-catalog";
import { BIKES } from "@/data/bikes";
import { recommend, type Answers } from "./quiz-engine";

const HEADER = "Nome,Link Vitale,Preço R$,Link YouTube,Autonomia,Capacidade,Descrição,Video Gravado";
const row = (name: string, link: string, price: string, autonomy = "Até 50km", cap = "2 pessoas", desc = "Descrição completa do modelo.") =>
  `${name},${link},"${price}",Não tem,${autonomy},${cap},"${desc}",Sim`;

describe("parsing de moeda brasileira", () => {
  it("aceita formatos com R$, milhar e centavos", () => {
    expect(parseBrlPrice("R$ 4.849,00")).toBe(4849);
    expect(parseBrlPrice("R$ 15.811,00")).toBe(15811);
    expect(parseBrlPrice("6129")).toBe(6129);
    expect(parseBrlPrice("6.129")).toBe(6129);
    expect(parseBrlPrice("7.138,50")).toBe(7138.5);
  });
  it("rejeita valores inválidos", () => {
    expect(parseBrlPrice("")).toBeNull();
    expect(parseBrlPrice("consultar")).toBeNull();
    expect(parseBrlPrice("R$ 0,00")).toBeNull();
  });
});

describe("autonomia e capacidade", () => {
  it("extrai km de textos livres", () => {
    expect(parseAutonomyKm("Até 100km")).toBe(100);
    expect(parseAutonomyKm("até 40 km")).toBe(40);
    expect(parseAutonomyKm("sem informação")).toBeNull();
  });
  it("extrai capacidade", () => {
    expect(parseCapacity("1 pessoa")).toBe(1);
    expect(parseCapacity("2 pessoas")).toBe(2);
    expect(parseCapacity("duas pessoas")).toBe(2);
    expect(parseCapacity("3 pessoas")).toBeNull();
  });
});

describe("aliases de nome", () => {
  it("mapeia a variação da planilha e do catálogo para o mesmo id", () => {
    expect(resolveBikeId("Ouxi GT20 Pro")).toBe("ouxi_gt20_pro");
    expect(resolveBikeId("Ouxi GT20 Pro (Panda GT20 Pro)")).toBe("ouxi_gt20_pro");
    expect(resolveBikeId("S8 ")).toBe("s8");
    expect(resolveBikeId("V8 Pro S")).toBe("v8_pro_s");
    expect(normalizeName("Ouxi GT20 Pro (Panda GT20 Pro)")).toBe("ouxi_gt20_pro");
  });
  it("retorna null para modelo desconhecido", () => {
    expect(resolveBikeId("Bike Nova X9")).toBeNull();
  });
});

describe("links", () => {
  it("valida somente meli.la", () => {
    expect(parseVitaleLink(" https://meli.la/2gjJctS ")).toBe("https://meli.la/2gjJctS");
    expect(parseVitaleLink("https://exemplo.com/abc")).toBeNull();
  });
});

describe("descrição curta determinística", () => {
  it("é estável e limitada", () => {
    const full = "Primeira frase bem completa sobre o modelo e suas características gerais de uso urbano. Segunda frase adicional com detalhes técnicos que não precisam aparecer no card do resultado.";
    const a = buildShortDescription(full);
    const b = buildShortDescription(full);
    expect(a).toBe(b);
    expect(a.length).toBeLessThanOrEqual(210);
    expect(a.startsWith("Primeira frase")).toBe(true);
  });
});

describe("snapshot da planilha", () => {
  it("reconhece linhas válidas e ignora desconhecidas, duplicadas e inválidas", () => {
    const csv = [
      HEADER,
      row("FT03", "https://meli.la/2gjJctS", "R$ 6.129,00", "Até 60km", "1 pessoa"),
      row("Ouxi GT20 Pro", "https://meli.la/1pFywK4", "R$ 7.138,00"),
      row("FT03", "https://meli.la/2gjJctS", "R$ 6.129,00"), // duplicada
      row("Bike Fantasma", "https://meli.la/9999999", "R$ 1.000,00"), // desconhecida
      row("V35", "https://site-errado.com/x", "R$ 10.250,00"), // link inválido
      row("V29 Pro", "https://meli.la/1LP5i2E", "combinar"), // preço inválido
    ].join("\n");

    const res = buildSnapshotFromCsv(csv);
    expect(res.recognizedCount).toBe(2);
    expect(res.bikes.map((b) => b.id).sort()).toEqual(["ft03", "ouxi_gt20_pro"]);
    expect(res.ignoredCount).toBe(4);
    expect(res.ignored.map((i) => i.reason)).toEqual([
      "Linha duplicada para o mesmo modelo",
      "Modelo desconhecido no catálogo",
      "Link Vitale inválido",
      "Preço inválido",
    ]);
  });

  it("gera hash estável e diferente quando os dados mudam", () => {
    const csv1 = [HEADER, row("FT03", "https://meli.la/2gjJctS", "R$ 6.129,00")].join("\n");
    const csv2 = [HEADER, row("FT03", "https://meli.la/2gjJctS", "R$ 6.229,00")].join("\n");
    const a = snapshotHash(buildSnapshotFromCsv(csv1).bikes);
    expect(a).toBe(snapshotHash(buildSnapshotFromCsv(csv1).bikes));
    expect(a).not.toBe(snapshotHash(buildSnapshotFromCsv(csv2).bikes));
  });

  it("falha quando o cabeçalho oficial está incompleto", () => {
    expect(() => buildSnapshotFromCsv("Nome,Preço R$\nFT03,10")).toThrow();
  });
});

describe("merge do catálogo", () => {
  const snapshot = [{
    id: "ft03",
    name: "FT03",
    linkVitale: "https://meli.la/NOVOLINK",
    price: 6500,
    autonomyKm: 72,
    capacity: 1 as const,
    description: "Descrição integral da planilha.",
    shortDescription: "Descrição curta.",
  }];

  it("sobrescreve somente os seis campos oficiais", () => {
    const merged = mergeCatalog(BIKES, snapshot);
    const ft03 = merged.find((b) => b.id === "ft03")!;
    const staticFt03 = BIKES.find((b) => b.id === "ft03")!;
    expect(ft03.internalPrice).toBe(6500);
    expect(ft03.autonomyKm).toBe(72);
    expect(ft03.capacity).toBe(1);
    expect(ft03.linkVitale).toBe("https://meli.la/NOVOLINK");
    expect(ft03.affiliateLink).toBe("https://meli.la/NOVOLINK");
    expect(ft03.linkMeta).toBe(staticFt03.linkMeta);
    expect(ft03.fullDescription).toBe("Descrição integral da planilha.");
    expect(ft03.shortDescription).toBe("Descrição curta.");
    expect(ft03.image).toBe(staticFt03.image);
    expect(ft03.bestFor).toEqual(staticFt03.bestFor);
    expect(merged).toHaveLength(BIKES.length);
  });

  it("ignora linhas desconhecidas, duplicadas e inválidas", () => {
    const merged = mergeCatalog(BIKES, [
      { ...snapshot[0], id: "modelo_inexistente" },
      { ...snapshot[0], price: -1 },
      ...snapshot,
      { ...snapshot[0], price: 9999 },
    ]);
    expect(merged).toHaveLength(BIKES.length);
    expect(merged.find((b) => b.id === "ft03")!.internalPrice).toBe(6500);
  });

  it("preço da planilha define a faixa de orçamento", () => {
    expect(tierForPrice(6999)).toBe("ate_7000");
    expect(tierForPrice(8000)).toBe("7000_8000");
    expect(tierForPrice(9500)).toBe("8000_10000");
    expect(tierForPrice(15811)).toBe("acima_10000");
    const merged = mergeCatalog(BIKES, [{ ...snapshot[0], price: 12000 }]);
    expect(merged.find((b) => b.id === "ft03")!.budgetTiers).toEqual(["acima_10000"]);
  });
});

describe("fallback da engine", () => {
  const answers: Answers = {
    main_use: "locomocao_diaria",
    daily_km_range: "10_25_km",
    route_type: "misto",
    rider_capacity_need: "apenas_1_pessoa",
    weight_range: "80_100kg",
    budget_range: "ate_7000",
    had_ebike_before: "nao",
  };

  it("usa o catálogo estático quando o dinâmico está vazio ou ausente", () => {
    const base = recommend(answers);
    expect(recommend(answers, null, []).primary.id).toBe(base.primary.id);
    expect(recommend(answers, null, null).primary.id).toBe(base.primary.id);
  });

  it("respeita o preço do catálogo dinâmico no filtro de orçamento", () => {
    const dynamic = mergeCatalog(BIKES, BIKES.map((b) => ({
      id: b.id,
      name: b.name,
      linkVitale: b.linkVitale,
      price: 20000,
      autonomyKm: b.autonomyKm,
      capacity: b.capacity,
      description: "x",
      shortDescription: "x",
    })));
    const res = recommend(answers, null, dynamic);
    expect(res.budgetLimited).toBe(true); // nenhuma elegível -> sinaliza limite e usa pool completo
    expect(res.primary.internalPrice).toBe(20000);
  });
});

// ---------- Colunas opcionais / bikes novas ----------
import {
  buildCatalogRows,
} from "./bike-catalog";
import {
  buildStableId,
  parseAtiva,
  parseImageUrl,
  parseList,
  parseWeightSupportKg,
} from "../../supabase/functions/_shared/bike-sheet";

const HEADER_FULL =
  "Nome,Link Vitale,Preço R$,Link YouTube,Autonomia,Capacidade,Descrição,Video Gravado,ID,Imagem,Peso Suportado,Usos,Terrenos,Pontos Fortes,Diferencial,Perfil Indicado,Ativa";
const fullRow = (
  name: string,
  link: string,
  price: string,
  extra: Partial<Record<"id" | "image" | "weight" | "usos" | "terrenos" | "fortes" | "dif" | "perfil" | "ativa", string>> = {},
) => [
  name, link, `"${price}"`, "Não tem", "Até 60km", "2 pessoas", '"Descrição completa."', "Não",
  extra.id ?? "", extra.image ?? "", extra.weight ?? "", `"${extra.usos ?? ""}"`, `"${extra.terrenos ?? ""}"`,
  `"${extra.fortes ?? ""}"`, `"${extra.dif ?? ""}"`, `"${extra.perfil ?? ""}"`, extra.ativa ?? "",
].join(",");

describe("parsers das colunas opcionais", () => {
  it("aceita somente URL de imagem https pública", () => {
    expect(parseImageUrl("https://cdn.exemplo.com/bike.jpg")).toBe("https://cdn.exemplo.com/bike.jpg");
    expect(parseImageUrl("http://cdn.exemplo.com/bike.jpg")).toBeNull();
    expect(parseImageUrl("cdn.exemplo.com/bike.jpg")).toBeNull();
    expect(parseImageUrl("")).toBeNull();
    expect(parseImageUrl("https://localhost/x.jpg")).toBeNull();
  });
  it("parseia peso suportado, listas e ativa", () => {
    expect(parseWeightSupportKg("150 kg")).toBe(150);
    expect(parseWeightSupportKg("10")).toBeNull();
    expect(parseList("Trabalho, Delivery; Urbano")).toEqual(["Trabalho", "Delivery", "Urbano"]);
    expect(parseList("")).toEqual([]);
    expect(parseAtiva("")).toBe(true);
    expect(parseAtiva("Sim")).toBe(true);
    expect(parseAtiva("Não")).toBe(false);
    expect(parseAtiva("0")).toBe(false);
  });
  it("gera ID estável a partir da coluna ID ou do nome", () => {
    expect(buildStableId("Nova X9", "")).toBe("nova_x9");
    expect(buildStableId("", "Bike Nova X9 (Turbo)")).toBe("bike_nova_x9");
    expect(buildStableId("", "")).toBeNull();
  });
});

describe("bikes novas: draft x elegível", () => {
  it("marca como draft quando faltam imagem/peso/usos/terrenos", () => {
    const csv = [HEADER_FULL, fullRow("Nova X9", "https://meli.la/1abc999", "R$ 7.500,00", { usos: "Urbano" })].join("\n");
    const res = buildSnapshotFromCsv(csv);
    const bike = res.bikes[0];
    expect(bike.id).toBe("nova_x9");
    expect(bike.isNew).toBe(true);
    expect(bike.status).toBe("draft");
    expect(bike.missingFields).toEqual(["Imagem (URL https)", "Peso Suportado", "Terrenos"]);
    expect(res.draftCount).toBe(1);
    expect(mergeCatalog(BIKES, res.bikes)).toHaveLength(BIKES.length);
  });

  it("fica elegível e entra no quiz com os dados mínimos", () => {
    const csv = [HEADER_FULL, fullRow("Nova X9", "https://meli.la/1abc999", "R$ 7.500,00", {
      image: "https://cdn.exemplo.com/x9.jpg", weight: "150 kg",
      usos: "Trabalho, Urbano", terrenos: "Plano, Misto", fortes: "Motor forte", dif: "Bateria dupla", perfil: "Entregador",
    })].join("\n");
    const res = buildSnapshotFromCsv(csv);
    expect(res.bikes[0].status).toBe("eligible");
    const merged = mergeCatalog(BIKES, res.bikes);
    expect(merged).toHaveLength(BIKES.length + 1);
    const nova = merged.find((b) => b.id === "nova_x9")!;
    expect(nova.isDynamic).toBe(true);
    expect(nova.image).toBe("https://cdn.exemplo.com/x9.jpg");
    expect(nova.terrains).toEqual(["Plano", "Misto"]);
    expect(nova.budgetTiers).toEqual(["7000_8000"]);

    // participa da recomendação por atributos (usos/terrenos/autonomia)
    const rec = recommend(
      { main_use: "trabalho_delivery_renda", daily_km_range: "10_25_km", route_type: "plano",
        rider_capacity_need: "garupa_as_vezes", weight_range: "100_120kg", budget_range: "7000_8000",
        had_ebike_before: "nao" },
      null,
      merged,
    );
    expect(rec.finalScores["nova_x9"]).toBeGreaterThan(0);
  });

  it("bike marcada como inativa não entra no quiz", () => {
    const csv = [HEADER_FULL, fullRow("Nova X9", "https://meli.la/1abc999", "R$ 7.500,00", {
      image: "https://cdn.exemplo.com/x9.jpg", weight: "150 kg", usos: "Urbano", terrenos: "Plano", ativa: "Não",
    })].join("\n");
    const res = buildSnapshotFromCsv(csv);
    expect(res.bikes[0].status).toBe("inactive");
    expect(mergeCatalog(BIKES, res.bikes)).toHaveLength(BIKES.length);
  });

  it("bike existente não é afetada por override ausente e mantém metadados estáticos", () => {
    const csv = [HEADER_FULL, fullRow("Ouxi GT20 Pro", "https://meli.la/1pFywK4", "R$ 7.138,00")].join("\n");
    const res = buildSnapshotFromCsv(csv);
    expect(res.bikes[0].id).toBe("ouxi_gt20_pro");
    expect(res.bikes[0].isNew).toBe(false);
    expect(res.bikes[0].status).toBe("eligible");
    const merged = mergeCatalog(BIKES, res.bikes);
    const b = merged.find((x) => x.id === "ouxi_gt20_pro")!;
    const s = BIKES.find((x) => x.id === "ouxi_gt20_pro")!;
    expect(b.image).toBe(s.image);
    expect(b.bestFor).toEqual(s.bestFor);
    expect(b.linkMeta).toBe(s.linkMeta);
    expect(b.internalPrice).toBe(7138);
  });
});

describe("linhas do painel", () => {
  it("expõe elegíveis, pendentes e estáticas sem corromper o quiz", () => {
    const csv = [
      HEADER_FULL,
      fullRow("FT03", "https://meli.la/2gjJctS", "R$ 6.129,00"),
      fullRow("Nova X9", "https://meli.la/1abc999", "R$ 7.500,00", { usos: "Urbano" }),
    ].join("\n");
    const res = buildSnapshotFromCsv(csv);
    const rows = buildCatalogRows(BIKES, res.bikes);
    const ft03 = rows.find((r) => r.id === "ft03")!;
    const nova = rows.find((r) => r.id === "nova_x9")!;
    const outra = rows.find((r) => r.id === "v35")!;
    expect(ft03.state).toBe("eligible");
    expect(nova.state).toBe("draft");
    expect(nova.missingFields.length).toBe(3);
    expect(outra.state).toBe("static");
    expect(rows).toHaveLength(BIKES.length + 1);
  });
});
