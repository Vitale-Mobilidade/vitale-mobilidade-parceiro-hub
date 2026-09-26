import { describe, expect, it } from "vitest";
import { parseEditorialBrief, parseSourceClaims, screenDiversity } from "../../supabase/functions/_shared/editorial-foundation";
import { layoutArticle } from "../../supabase/functions/_shared/editorial-automation";

const transcript = "A V9 Max subiu a ladeira sem perder tração. O fabricante informa autonomia de 50 km. No nosso percurso de 19 km, a bateria terminou com carga.";

describe("editorial source and outline gate", () => {
  it("keeps only literal source excerpts and separates claim kinds", () => {
    const claims = parseSourceClaims([
      { id: "c1", kind: "practical_experience", statement: "Subiu a ladeira sem perder tração.", excerpt: "subiu a ladeira sem perder tração", caveat: "Neste percurso." },
      { id: "c2", kind: "manufacturer_claim", statement: "Autonomia declarada de 50 km.", excerpt: "fabricante informa autonomia de 50 km", caveat: "Não é medida do teste." },
      { id: "c3", kind: "observed_fact", statement: "Fez 100 km no teste.", excerpt: "Fez 100 km no teste", caveat: "" },
    ], transcript);
    expect(claims.map(claim => claim.id)).toEqual(["c1", "c2"]);
    expect(claims[1].kind).toBe("manufacturer_claim");
  });

  it("rejects outlines without referenced evidence or known bikes", () => {
    const claims = parseSourceClaims([{ id: "c1", kind: "practical_experience", statement: "Subiu a ladeira sem perder tração.", excerpt: "subiu a ladeira sem perder tração", caveat: "" }], transcript);
    const base = { archetype: "real_world_test", primaryIntent: "Como a bike sobe?", secondaryIntents: [], thesis: "A subida foi estável.",
      readerQuestion: "A V9 Max sobe?", uniqueInsight: "O teste descreve a ladeira.", opening: "A subida é central.", conclusion: "A observação depende do trajeto.",
      sections: [{ heading: "A ladeira", purpose: "Relatar o observado", claimIds: ["c1"] }, { heading: "Limites", purpose: "Contextualizar", claimIds: ["c1"] }],
      modules: [{ type: "radar", afterSection: 0, reason: "Preço após o teste", bikeIds: ["bike_inventada"], toolSlug: "" }], faqQuestions: [], warnings: [] };
    expect(parseEditorialBrief(base, claims, new Set(["v9_max"]))?.modules).toEqual([]);
    expect(parseEditorialBrief({ ...base, sections: base.sections.map(section => ({ ...section, claimIds: ["c9"] })) }, claims, new Set(["v9_max"]))).toBeNull();
  });

  it("respects only selected modules and their positions for new articles", () => {
    const blocks = layoutArticle({ sections: ["Teste", "Limite", "Decisão"].map(heading => ({ type: "text", heading, text: heading })),
      videoId: "3impuq3th8g", bikeId: "v9_max", offerBikeIds: new Set(["v9_max"]), hasFaq: false,
      plannedModules: [{ type: "radar", afterSection: 1, reason: "Contexto de preço", bikeIds: ["v9_max"] }] });
    expect(blocks.map(block => block.type)).toEqual(["text", "text", "radar", "text"]);
    expect(blocks.every(block => block.planned)).toBe(true);
  });

  it("accepts a contextual article link only for an existing published target", () => {
    const claims = parseSourceClaims([{ id: "c1", kind: "practical_experience", statement: "Subiu a ladeira sem perder tração.", excerpt: "subiu a ladeira sem perder tração", caveat: "" }], transcript);
    const base = { archetype: "real_world_test", primaryIntent: "Teste de subida", secondaryIntents: [], thesis: "Subiu bem.",
      readerQuestion: "Como sobe?", uniqueInsight: "Experiência na ladeira", opening: "Teste de subida", conclusion: "Válido no trajeto descrito",
      sections: [{ heading: "Subida", purpose: "Observação", claimIds: ["c1"] }, { heading: "Limites", purpose: "Contexto", claimIds: ["c1"] }],
      modules: [{ type: "article_link", afterSection: 0, reason: "Aprofunda o modelo", bikeIds: [], articleId: "published-id", toolSlug: "" }], faqQuestions: [], warnings: [] };
    expect(parseEditorialBrief(base, claims, new Set(), new Set(["published-id"]))?.modules).toHaveLength(1);
    expect(parseEditorialBrief(base, claims, new Set(), new Set())?.modules).toHaveLength(0);
  });

  it("reports repeated headings against published articles with a concrete peer", () => {
    const result = screenDiversity({ id: "new", title: "Teste", summary: "Uma nova abertura", headings: ["Garupa", "Qual escolher"] },
      [{ id: "published", title: "Comparativo antigo", summary: "Outra abertura", headings: ["Garupa", "Qual escolher"] }]);
    expect(result.closestArticleId).toBe("published");
    expect(result.score).toBeLessThan(45);
    expect(result.alerts[0]).toContain("Comparativo antigo");
  });
});
