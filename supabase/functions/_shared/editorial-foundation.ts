/** Private, versioned planning contract. No article body or commercial offer is generated here. */
export const ARCHETYPES = [
  "direct_comparison", "product_review", "real_world_test", "buying_guide",
  "audience_need", "education", "market_price", "curated_list", "use_comparison",
] as const;
export type Archetype = (typeof ARCHETYPES)[number];

export const CLAIM_KINDS = ["observed_fact", "manufacturer_claim", "practical_experience", "editorial_opinion", "inference"] as const;
export type ClaimKind = (typeof CLAIM_KINDS)[number];
export type SourceClaim = { id: string; kind: ClaimKind; statement: string; excerpt: string; caveat: string };
export type OutlineSection = { heading: string; purpose: string; claimIds: string[] };
export type PlannedModule = { type: "video" | "radar" | "quiz" | "tool" | "comparison" | "faq" | "article_link";
  afterSection: number; reason: string; bikeIds: string[]; toolSlug?: string; articleId?: string };
export const EDITORIAL_TOOL_SLUGS = ["carro-vs-bike", "moto-vs-bike", "aplicativos-vs-bike", "transporte-publico-vs-bike",
  "veiculo-alugado-vs-bike-propria", "meta-entregas", "economia-de-tempo"] as const;
export type EditorialBrief = {
  archetype: Archetype; primaryIntent: string; secondaryIntents: string[];
  thesis: string; readerQuestion: string; uniqueInsight: string;
  opening: string; conclusion: string; claims: SourceClaim[];
  sections: OutlineSection[]; modules: PlannedModule[];
  faqQuestions: string[];
  /** Informative editorial cautions the text must respect (e.g. "60 km/h é leitura do painel"). Never block alone. */
  warnings: string[];
  /** Material, unmitigated risks. Absent (legacy/malformed) counts as unclassified and blocks: fail closed. */
  blockingRisks?: string[];
};

const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const norm = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]+/g, " ").trim();

/** Fail closed: every usable source claim must quote the supplied transcript. */
export function parseSourceClaims(raw: unknown, transcript: string): SourceClaim[] {
  if (!Array.isArray(raw)) return [];
  const source = norm(transcript);
  const seen = new Set<string>();
  return raw.slice(0, 80).flatMap((item): SourceClaim[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const row = item as Record<string, unknown>;
    const id = clean(row.id, 24);
    const statement = clean(row.statement, 800);
    const excerpt = clean(row.excerpt, 800);
    const kind = row.kind as ClaimKind;
    if (!/^c[1-9]\d*$/.test(id) || seen.has(id) || !CLAIM_KINDS.includes(kind) ||
      statement.length < 10 || excerpt.length < 12 || !source.includes(norm(excerpt))) return [];
    seen.add(id);
    return [{ id, kind, statement, excerpt, caveat: clean(row.caveat, 500) }];
  });
}

export function parseEditorialBrief(raw: unknown, claims: SourceClaim[], knownBikeIds: ReadonlySet<string>, knownArticleIds: ReadonlySet<string> = new Set()): EditorialBrief | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (!ARCHETYPES.includes(row.archetype as Archetype)) return null;
  const claimIds = new Set(claims.map((claim) => claim.id));
  const sections = Array.isArray(row.sections) ? row.sections.slice(0, 14).flatMap((item): OutlineSection[] => {
    if (!item || typeof item !== "object") return [];
    const section = item as Record<string, unknown>;
    const heading = clean(section.heading, 160);
    const purpose = clean(section.purpose, 500);
    const ids = Array.isArray(section.claimIds) ? section.claimIds.filter((id): id is string => typeof id === "string" && claimIds.has(id)).slice(0, 15) : [];
    return heading && purpose ? [{ heading, purpose, claimIds: ids }] : [];
  }) : [];
  if (sections.length < 2 || !sections.some((section) => section.claimIds.length)) return null;
  const modules = Array.isArray(row.modules) ? row.modules.slice(0, 12).flatMap((item): PlannedModule[] => {
    if (!item || typeof item !== "object") return [];
    const module = item as Record<string, unknown>;
    if (!["video", "radar", "quiz", "tool", "comparison", "faq", "article_link"].includes(String(module.type))) return [];
    const afterSection = Number(module.afterSection);
    const reason = clean(module.reason, 400);
    if (!Number.isInteger(afterSection) || afterSection < 0 || afterSection >= sections.length || !reason) return [];
    const bikeIds = Array.isArray(module.bikeIds) ? module.bikeIds.filter((id): id is string => typeof id === "string" && knownBikeIds.has(id)).slice(0, 3) : [];
    if (["radar", "comparison"].includes(String(module.type)) && !bikeIds.length) return [];
    if (module.type === "tool" && !EDITORIAL_TOOL_SLUGS.includes(clean(module.toolSlug, 80) as typeof EDITORIAL_TOOL_SLUGS[number])) return [];
    if (module.type === "article_link" && !knownArticleIds.has(clean(module.articleId, 60))) return [];
    return [{ type: module.type as PlannedModule["type"], afterSection, reason, bikeIds,
      ...(module.type === "tool" ? { toolSlug: clean(module.toolSlug, 80) } : {}),
      ...(module.type === "article_link" ? { articleId: clean(module.articleId, 60) } : {}) }];
  }) : [];
  const brief: EditorialBrief = {
    archetype: row.archetype as Archetype,
    primaryIntent: clean(row.primaryIntent, 300),
    secondaryIntents: Array.isArray(row.secondaryIntents) ? row.secondaryIntents.map((v) => clean(v, 200)).filter(Boolean).slice(0, 6) : [],
    thesis: clean(row.thesis, 600), readerQuestion: clean(row.readerQuestion, 300),
    uniqueInsight: clean(row.uniqueInsight, 600), opening: clean(row.opening, 500),
    conclusion: clean(row.conclusion, 500), claims, sections, modules,
    faqQuestions: Array.isArray(row.faqQuestions) ? row.faqQuestions.map((v) => clean(v, 240)).filter(Boolean).slice(0, 6) : [],
    warnings: Array.isArray(row.warnings) ? row.warnings.map((v) => clean(v, 500)).filter(Boolean).slice(0, 12) : [],
    ...(Array.isArray(row.blockingRisks) ? { blockingRisks: row.blockingRisks.map((v) => clean(v, 500)).filter(Boolean).slice(0, 12) } : {}),
  };
  return brief.primaryIntent && brief.thesis && brief.readerQuestion && brief.uniqueInsight ? brief : null;
}

export type CorpusItem = { id: string; title: string; summary: string; headings: string[]; body?: string; conclusion?: string; archetype?: string };
export type DiversityResult = { score: number; alerts: string[]; closestArticleId: string | null };

function phrases(value: string): Set<string> {
  const words = norm(value).split(" ").filter(Boolean);
  const result = new Set<string>();
  for (let i = 0; i <= words.length - 5; i++) result.add(words.slice(i, i + 5).join(" "));
  return result;
}

function sectionOrderOverlap(left: string[], right: string[]): number {
  if (left.length < 2 || right.length < 2) return 0;
  const pairs = left.slice(1).map((heading, i) => `${left[i]}|${heading}`);
  const prior = new Set(right.slice(1).map((heading, i) => `${right[i]}|${heading}`));
  return pairs.filter((pair) => prior.has(pair)).length / Math.max(1, Math.min(left.length - 1, right.length - 1));
}

/** Explainable screening, calibrated by editors; never used as an AI-content detector. */
export function screenDiversity(candidate: CorpusItem, corpus: CorpusItem[]): DiversityResult {
  let closestArticleId: string | null = null;
  let closest = 0;
  const alerts: string[] = [];
  const headings = candidate.headings.map(norm).filter(Boolean);
  const candidatePhrases = phrases(`${candidate.summary} ${candidate.body ?? ""} ${candidate.conclusion ?? ""}`);
  const candidateTokens = new Set(norm(`${candidate.title} ${candidate.summary} ${candidate.body ?? ""}`).split(" ").filter((word) => word.length > 4));
  for (const article of corpus.filter((item) => item.id !== candidate.id)) {
    const prior = article.headings.map(norm).filter(Boolean);
    const shared = headings.filter((heading) => prior.includes(heading));
    const headingOverlap = shared.length / Math.max(1, Math.min(headings.length, prior.length));
    const orderOverlap = sectionOrderOverlap(headings, prior);
    const sameOpening = norm(candidate.summary).slice(0, 100) === norm(article.summary).slice(0, 100) && norm(candidate.summary).length >= 100;
    const sameConclusion = norm(candidate.conclusion ?? "").length >= 80 &&
      norm(candidate.conclusion ?? "").slice(0, 100) === norm(article.conclusion ?? "").slice(0, 100);
    const priorPhrases = phrases(`${article.summary} ${article.body ?? ""} ${article.conclusion ?? ""}`);
    const repeatedPhrases = [...candidatePhrases].filter((phrase) => priorPhrases.has(phrase)).length;
    const phraseOverlap = repeatedPhrases / Math.max(1, Math.min(candidatePhrases.size, priorPhrases.size));
    const priorTokens = new Set(norm(`${article.title} ${article.summary} ${article.body ?? ""}`).split(" ").filter((word) => word.length > 4));
    const sharedTokens = [...candidateTokens].filter((word) => priorTokens.has(word)).length;
    const lexicalOverlap = sharedTokens / Math.max(1, Math.min(candidateTokens.size, priorTokens.size));
    const score = Math.min(100, Math.round(headingOverlap * 35 + orderOverlap * 20 + lexicalOverlap * 15 + phraseOverlap * 20 +
      (sameOpening ? 25 : 0) + (sameConclusion ? 25 : 0)));
    if (score > closest) { closest = score; closestArticleId = article.id; }
    if (shared.length >= 2) alerts.push(`${article.title}: ${shared.length} subtítulos iguais (${shared.slice(0, 3).join(", ")}).`);
    if (orderOverlap >= 0.5 && headings.length >= 3) alerts.push(`${article.title}: sequência de seções muito semelhante.`);
    if (sameOpening) alerts.push(`${article.title}: abertura idêntica.`);
    if (sameConclusion) alerts.push(`${article.title}: conclusão idêntica.`);
    if (repeatedPhrases >= 8 && phraseOverlap > 0.18) alerts.push(`${article.title}: frases repetidas em excesso.`);
    if (lexicalOverlap > 0.82 && candidateTokens.size >= 25) alerts.push(`${article.title}: vocabulário e argumento muito próximos; verificar canibalização.`);
  }
  return { score: 100 - closest, alerts: alerts.slice(0, 10), closestArticleId };
}

/** Cheap, deterministic source fingerprint: stage checkpoints are reused only for the same transcript. */
export function sourceFingerprint(transcript: string): string {
  let h = 2166136261;
  for (let i = 0; i < transcript.length; i++) { h ^= transcript.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `${transcript.length}:${(h >>> 0).toString(16)}`;
}

/** Fail closed: a brief is usable only when its source checkpoint matches the current transcript. */
export function briefMatchesSource(stages: unknown, transcript: string): boolean {
  if (!stages || typeof stages !== "object" || Array.isArray(stages)) return false;
  const source = (stages as Record<string, unknown>).source as Record<string, unknown> | undefined;
  return !!transcript.trim() && typeof source?.key === "string" && source.key === sourceFingerprint(transcript);
}

/** Fail closed: text sections must keep the exact count, order and headings of the current outline. */
export function draftMatchesOutline(blocks: { type?: string; heading?: string | null }[], outline: { heading: string }[] | undefined): boolean {
  if (!Array.isArray(outline) || outline.length === 0) return false;
  const headings = blocks.filter((block) => block?.type === "text").map((block) => (block.heading ?? "").trim());
  return headings.length === outline.length && outline.every((section, i) => section.heading.trim() === headings[i]);
}

export const MIN_DIFFERENTIATION = 45;
export type OutlineGate = { status: "ready" | "qa_failed"; blockers: string[]; cautions: string[] };

/**
 * Separates informative cautions from material blockers. Cautions stay visible and are enforced in draft/QA;
 * blockers (declared unmitigated risks, unclassified risks, material similarity) keep the brief closed.
 * Unsupported claims, insufficient source and uncertain intent fail earlier in generateBrief.
 */
export function outlineGate(brief: Pick<EditorialBrief, "warnings" | "blockingRisks">, diversity: Pick<DiversityResult, "score" | "alerts">): OutlineGate {
  const blockers: string[] = [];
  if (!Array.isArray(brief.blockingRisks)) blockers.push("Outline sem classificação de riscos materiais; gere o outline de novo.");
  else blockers.push(...brief.blockingRisks.map((risk) => `Risco material: ${risk}`));
  blockers.push(...diversity.alerts);
  if (diversity.score < MIN_DIFFERENTIATION) blockers.push("Diferenciação estrutural insuficiente frente ao corpus publicado.");
  return { status: blockers.length ? "qa_failed" : "ready", blockers, cautions: [...(brief.warnings ?? [])] };
}

/** Final QA: every applicable caution must be verifiably respected; a missing/malformed check fails closed. */
export function cautionReviewIssues(cautions: string[], violations: unknown): string[] {
  if (!Array.isArray(violations)) return cautions.length ? ["Cautelas editoriais não verificadas pela revisão final."] : [];
  return violations.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .slice(0, 12).map((v) => `Cautela desrespeitada: ${v.trim().slice(0, 300)}`);
}

export const DIVERSITY_CORPUS_LIMIT = 500;
type CorpusArticleRow = { id: string; title?: string | null; summary?: string | null; status?: string | null; blocks?: unknown };
type CorpusBriefRow = { article_id: string; status?: string | null; payload?: unknown };
export type DiversityCorpus = { items: CorpusItem[]; counts: { published: number; written: number; outlines: number; total: number } };

/**
 * Differentiation corpus: published articles, drafts with written text and ready outlines (without text yet).
 * One entry per article (written text wins over its outline), current article excluded, archived ignored.
 */
export function buildDiversityCorpus(articles: CorpusArticleRow[], briefs: CorpusBriefRow[], currentId: string, limit = DIVERSITY_CORPUS_LIMIT): DiversityCorpus {
  const byId = new Map<string, CorpusItem>();
  const counts = { published: 0, written: 0, outlines: 0, total: 0 };
  const articleById = new Map(articles.map((a) => [a.id, a]));
  for (const a of articles) {
    if (!a?.id || a.id === currentId || byId.has(a.id) || a.status === "archived") continue;
    const blocks = (Array.isArray(a.blocks) ? a.blocks : []) as { type?: string; heading?: string; text?: string }[];
    const texts = blocks.filter((b) => b?.type === "text" && typeof b.text === "string" && b.text.trim());
    if (a.status !== "published" && !texts.length) continue;
    byId.set(a.id, { id: a.id, title: clean(a.title, 200), summary: clean(a.summary, 1000),
      headings: blocks.map((b) => clean(b?.heading, 160)).filter(Boolean),
      body: texts.map((b) => clean(b.text, 1200)).join(" ").slice(0, 4000), conclusion: clean(texts.at(-1)?.text, 1200) });
    if (a.status === "published") counts.published++; else counts.written++;
  }
  for (const b of briefs) {
    if (!b?.article_id || b.article_id === currentId || byId.has(b.article_id) || b.status !== "ready") continue;
    const art = articleById.get(b.article_id);
    if (art?.status === "archived") continue;
    const p = (b.payload && typeof b.payload === "object" ? b.payload : {}) as Record<string, unknown>;
    const sections = (Array.isArray(p.sections) ? p.sections : []) as Record<string, unknown>[];
    const headings = sections.map((s) => clean(s?.heading, 160)).filter(Boolean);
    if (!headings.length) continue;
    byId.set(b.article_id, { id: b.article_id, title: clean(art?.title, 200) || "Outline sem título",
      summary: clean(p.opening, 1000), headings, archetype: clean(p.archetype, 40),
      body: [p.thesis, p.uniqueInsight, ...sections.map((s) => s?.purpose)].map((v) => clean(v, 600)).join(" ").slice(0, 4000),
      conclusion: clean(p.conclusion, 1200) });
    counts.outlines++;
  }
  const items = [...byId.values()].slice(0, limit);
  counts.total = items.length;
  return { items, counts };
}
