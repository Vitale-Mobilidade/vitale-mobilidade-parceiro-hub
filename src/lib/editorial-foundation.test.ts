import { describe, expect, it } from "vitest";
import { cautionReviewIssues, outlineGate, parseEditorialBrief, parseSourceClaims, screenDiversity } from "../../supabase/functions/_shared/editorial-foundation";
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
    expect(result.score).toBeLessThanOrEqual(45);
    expect(result.alerts[0]).toContain("Comparativo antigo");
  });

  it("flags a repeated conclusion even when headings differ", () => {
    const conclusion = "A compra faz sentido somente para quem percorre este trajeto e aceita essa limitação específica.";
    const result = screenDiversity({ id: "new", title: "Teste de subida", summary: "Nova abertura", headings: ["Ladeira", "Limites"], conclusion },
      [{ id: "published", title: "Teste antigo", summary: "Outra abertura", headings: ["Percurso", "Resultado"], conclusion }]);
    expect(result.alerts).toContain("Teste antigo: conclusão idêntica.");
  });
});

import { sourceFingerprint } from "../../supabase/functions/_shared/editorial-foundation";
describe("stage checkpoints", () => {
  it("reuses a checkpoint only for the identical transcript", () => {
    const a = "salve galera ".repeat(40);
    expect(sourceFingerprint(a)).toBe(sourceFingerprint(a));
    expect(sourceFingerprint(a)).not.toBe(sourceFingerprint(`${a}x`));
    expect(sourceFingerprint(a.replace("salve", "salvo"))).not.toBe(sourceFingerprint(a));
  });
});

import { briefMatchesSource, draftMatchesOutline } from "../../supabase/functions/_shared/editorial-foundation";

describe("stale brief and outline guards", () => {
  it("refuses a brief whose source checkpoint does not match the current transcript", () => {
    const stages = { source: { key: sourceFingerprint(transcript) } };
    expect(briefMatchesSource(stages, transcript)).toBe(true);
    expect(briefMatchesSource(stages, `${transcript} Trecho novo salvo depois.`)).toBe(false);
    expect(briefMatchesSource({}, transcript)).toBe(false);
    expect(briefMatchesSource(null, transcript)).toBe(false);
    expect(briefMatchesSource(stages, "")).toBe(false);
  });
  it("refuses a draft whose sections, order or headings differ from the current outline", () => {
    const outline = [{ heading: "Ladeira" }, { heading: "Autonomia" }];
    const blocks = [{ type: "video" }, { type: "text", heading: "Ladeira" }, { type: "radar" }, { type: "text", heading: "Autonomia" }];
    expect(draftMatchesOutline(blocks, outline)).toBe(true);
    expect(draftMatchesOutline([blocks[3], blocks[1]], outline)).toBe(false);
    expect(draftMatchesOutline([blocks[1]], outline)).toBe(false);
    expect(draftMatchesOutline([blocks[1], { type: "text", heading: "Bateria" }], outline)).toBe(false);
    expect(draftMatchesOutline(blocks, [])).toBe(false);
    expect(draftMatchesOutline(blocks, undefined)).toBe(false);
  });
});

describe("outline gate: cautions vs material blockers (regression GT20 aDLpuoXPofU)", () => {
  // The eight honest cautions produced for the real GT20 pilot outline (differentiation 98).
  const gt20Cautions = [
    "Não apresentar como teste próprio da Vitale.",
    "60 km/h é leitura do painel, não medição.",
    "Autonomia é declarada pelo fabricante.",
    "Primeiras impressões: sem uso prolongado.",
    "Não afirmar durabilidade.",
    "Preço citado é datado.",
    "Não generalizar o trajeto do vídeo.",
    "Diferenciar opinião de especificação.",
  ];

  it("lets an honest brief with only informative cautions advance, keeping cautions visible", () => {
    const gate = outlineGate({ warnings: gt20Cautions, blockingRisks: [] }, { score: 98, alerts: [] });
    expect(gate.status).toBe("ready");
    expect(gate.blockers).toEqual([]);
    expect(gate.cautions).toEqual(gt20Cautions);
  });

  it("stays fail-closed for declared material risks, similarity and legacy briefs without risk classification", () => {
    expect(outlineGate({ warnings: gt20Cautions, blockingRisks: ["Tese depende de medição ausente da fonte."] }, { score: 98, alerts: [] }).status).toBe("qa_failed");
    expect(outlineGate({ warnings: [], blockingRisks: [] }, { score: 30, alerts: [] }).status).toBe("qa_failed");
    expect(outlineGate({ warnings: [], blockingRisks: [] }, { score: 90, alerts: ["Peer: abertura idêntica."] }).status).toBe("qa_failed");
    expect(outlineGate({ warnings: gt20Cautions }, { score: 98, alerts: [] }).status).toBe("qa_failed");
  });

  it("parses blockingRisks only when the model classified them", () => {
    const claims = parseSourceClaims([{ id: "c1", kind: "practical_experience", statement: "Subiu a ladeira sem perder tração.", excerpt: "subiu a ladeira sem perder tração", caveat: "" }], transcript);
    const base = { archetype: "product_review", primaryIntent: "Primeiras impressões", secondaryIntents: [], thesis: "Boa primeira impressão.",
      readerQuestion: "Vale a pena?", uniqueInsight: "Leitura prática", opening: "Abertura", conclusion: "Depende do uso",
      sections: [{ heading: "Subida", purpose: "Observação", claimIds: ["c1"] }, { heading: "Limites", purpose: "Contexto", claimIds: ["c1"] }],
      modules: [], faqQuestions: [], warnings: gt20Cautions };
    expect(parseEditorialBrief({ ...base, blockingRisks: [] }, claims, new Set())?.blockingRisks).toEqual([]);
    expect(parseEditorialBrief(base, claims, new Set())?.blockingRisks).toBeUndefined();
  });

  it("final QA blocks violated cautions and fails closed when cautions were not checked", () => {
    expect(cautionReviewIssues(gt20Cautions, [])).toEqual([]);
    expect(cautionReviewIssues(gt20Cautions, ["Texto afirma 'no nosso teste'."])).toEqual(["Cautela desrespeitada: Texto afirma 'no nosso teste'."]);
    expect(cautionReviewIssues(gt20Cautions, undefined)).toHaveLength(1);
    expect(cautionReviewIssues([], undefined)).toEqual([]);
  });
});

import { buildDiversityCorpus } from "../../supabase/functions/_shared/editorial-foundation";

describe("diversity corpus includes drafts and ready outlines (regression: 5 pilots scored only vs 2 published)", () => {
  const outline = (heading: string) => ({ archetype: "real_world_test", opening: "Abertura do teste real no trajeto urbano com subida forte e bateria.",
    thesis: "A bike aguenta o trajeto.", uniqueInsight: "Trajeto real", conclusion: "Serve para quem roda esse trajeto diariamente com ladeiras.",
    sections: [{ heading: "Trajeto", purpose: "Relatar" }, { heading: "Subida", purpose: "Relatar" }, { heading, purpose: "Decidir" }] });

  it("blocks a second new brief that repeats a ready outline not yet published", () => {
    const articles = [{ id: "a", title: "GT20", status: "draft", blocks: [] }, { id: "b", title: "FT03", status: "draft", blocks: [] }];
    const briefs = [{ article_id: "a", status: "ready", payload: outline("Vale a pena?") }, { article_id: "b", status: "ready", payload: outline("Vale a pena?") }];
    const corpus = buildDiversityCorpus(articles, briefs, "b");
    expect(corpus.items.map((i) => i.id)).toEqual(["a"]);
    expect(corpus.counts).toEqual({ published: 0, written: 0, outlines: 1, total: 1 });
    const p = outline("Vale a pena?");
    const result = screenDiversity({ id: "b", title: "FT03", summary: p.opening, headings: p.sections.map((s) => s.heading), conclusion: p.conclusion }, corpus.items);
    expect(result.closestArticleId).toBe("a");
    expect(outlineGate({ warnings: [], blockingRisks: [] }, result).status).toBe("qa_failed");
  });

  it("dedupes peers (written text wins), excludes current and archived, ignores non-ready briefs", () => {
    const articles = [
      { id: "p", title: "Pub", status: "published", blocks: [{ type: "text", heading: "H", text: "Texto publicado" }] },
      { id: "w", title: "Draft", status: "draft", blocks: [{ type: "text", heading: "Escrito", text: "Texto escrito" }] },
      { id: "x", title: "Arq", status: "archived", blocks: [{ type: "text", heading: "H", text: "t" }] },
      { id: "e", title: "Vazio", status: "draft", blocks: [] },
    ];
    const briefs = [{ article_id: "w", status: "ready", payload: outline("X") }, { article_id: "x", status: "ready", payload: outline("X") },
      { article_id: "e", status: "qa_failed", payload: outline("X") }, { article_id: "cur", status: "ready", payload: outline("X") }];
    const corpus = buildDiversityCorpus(articles, briefs, "cur");
    expect(corpus.items.map((i) => i.id).sort()).toEqual(["p", "w"]);
    expect(corpus.items.find((i) => i.id === "w")?.headings).toEqual(["Escrito"]);
  });

  it("holds 100 outlines within the corpus limit and screens them quickly", () => {
    const articles = Array.from({ length: 100 }, (_, i) => ({ id: `id${i}`, title: `Artigo ${i}`, status: "draft", blocks: [] }));
    const briefs = articles.map((a, i) => ({ article_id: a.id, status: "ready", payload: { ...outline(`Seção única ${i}`), opening: `Abertura ${i} distinta` } }));
    const corpus = buildDiversityCorpus(articles, briefs, "novo");
    expect(corpus.counts.total).toBe(100);
    const t = Date.now();
    screenDiversity({ id: "novo", title: "Novo", summary: "Outra coisa", headings: ["A", "B"] }, corpus.items);
    expect(Date.now() - t).toBeLessThan(2000);
  });
});

describe("bike context of outlines", () => {
  it("requires a contextual Radar plan or a specific omission when current price decides", () => {
    const brief = { thesis: "Qual bike entrega melhor valor hoje?", readerQuestion: "Qual custa menos?",
      conclusion: "Compare o preço atual antes de escolher.",
      sections: [{ heading: "Preço e escolha", purpose: "Verificar oferta atual", claimIds: ["c1"] }],
      modules: [], warnings: [], blockingRisks: [] };
    const diversity = { score: 96, alerts: [] };
    const offers = new Set(["v29_pro"]);
    expect(outlineGate(brief, diversity, offers).status).toBe("qa_failed");
    expect(outlineGate({ ...brief, modules: [{ type: "radar" as const, afterSection: 0,
      reason: "Comparar oferta no momento da escolha", bikeIds: ["v29_pro"] }] }, diversity, offers).status).toBe("ready");
    expect(outlineGate({ ...brief, radarOmission: "O preço citado é histórico e não determina a escolha atual." }, diversity, offers).status).toBe("ready");
    expect(outlineGate(brief, diversity, new Set()).status).toBe("ready");
  });

  it("marks an outline stale when bike IDs change or the control is missing", async () => {
    const { bikeContextKey, briefMatchesBikes } = await import("../../supabase/functions/_shared/editorial-foundation");
    expect(bikeContextKey("v8_pro", ["v40_pro", "v8_pro"])).toBe("v40_pro,v8_pro");
    const stages = { outline: { bikes: bikeContextKey("v8_pro", ["v40_pro"]) } };
    expect(briefMatchesBikes(stages, "v8_pro", ["v40_pro"])).toBe(true);
    expect(briefMatchesBikes(stages, "v29_pro", ["v8_pro_s"])).toBe(false);
    // Pilot outlines were generated with no bikes and without this key: fail-closed.
    expect(briefMatchesBikes({ outline: { sections: 4, modules: 0 } }, "coswheel_gt20", [])).toBe(false);
    expect(briefMatchesBikes({ outline: { bikes: "" } }, "coswheel_gt20", [])).toBe(false);
  });

  it("keeps contextual modules only for the associated bikes, never forcing them", () => {
    const text = "A GT20 subiu a ladeira sem perder tração. O painel marcou 60 km/h.";
    const claims = parseSourceClaims([{ id: "c1", kind: "practical_experience", statement: "Subiu a ladeira.", excerpt: "subiu a ladeira sem perder tração", caveat: "" }], text);
    const base = { archetype: "real_world_test", primaryIntent: "Primeiras impressões", secondaryIntents: [], thesis: "t", readerQuestion: "q",
      uniqueInsight: "u", opening: "o", conclusion: "c", claims,
      sections: [{ heading: "Subida", purpose: "p", claimIds: ["c1"] }, { heading: "Painel", purpose: "p", claimIds: [] }],
      modules: [
        { type: "radar", afterSection: 0, reason: "Preço da GT20 após a subida", bikeIds: ["coswheel_gt20"], toolSlug: "" },
        { type: "radar", afterSection: 1, reason: "Outra bike", bikeIds: ["v8_pro"], toolSlug: "" },
      ], faqQuestions: [], warnings: [] };
    const associated = new Set(["coswheel_gt20"]);
    const modules = parseEditorialBrief(base, claims, associated)?.modules ?? [];
    expect(modules).toHaveLength(1);
    expect(modules[0].bikeIds).toEqual(["coswheel_gt20"]);
    expect(parseEditorialBrief({ ...base, modules: [] }, claims, associated)?.modules).toEqual([]);
    expect(parseEditorialBrief(base, claims, new Set())?.modules).toEqual([]);
  });
});
