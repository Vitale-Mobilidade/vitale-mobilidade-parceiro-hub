/** Pure editorial contract shared by the browser preview and the privileged API. */
export const ARTICLE_STATUSES = ["draft", "generated", "validation_error", "ready", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];
export const CONTENT_TYPES = ["test", "comparison", "guide", "tips", "economy", "other"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const BLOCK_TYPES = ["hero", "summary", "text", "video", "radar", "specs", "pros_cons", "faq", "related", "quiz", "comparator", "cta", "tool"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type ArticleBlock = {
  type: BlockType;
  heading?: string;
  text?: string;
  sourceExcerpt?: string;
  bikeId?: string;
  bikeIds?: string[];
  videoId?: string;
  toolSlug?: string;
  articleId?: string;
  planned?: boolean;
};
export type ArticleFaq = { question: string; answer: string; sourceExcerpt: string };

export type EditorialArticle = {
  id: string;
  video_id: string;
  primary_bike_id: string | null;
  related_bike_ids: string[];
  related_article_ids: string[];
  title: string;
  slug: string | null;
  content_type: ContentType;
  foundation_required?: boolean;
  summary: string;
  summary_source_excerpt: string;
  blocks: ArticleBlock[];
  faq: ArticleFaq[];
  seo_title: string;
  meta_description: string;
  og_title: string;
  og_description: string;
  og_image_url: string | null;
  indexable: boolean;
  status: ArticleStatus;
  validation_errors: string[];
  prompt_version: number | null;
  model: string | null;
  reviewed_at: string | null;
  published_at: string | null;
  revision: number;
  updated_at: string;
};

export type EditorialVideo = {
  youtube_id: string;
  title: string;
  youtube_url: string;
  published_on: string | null;
  thumbnail_url: string | null;
  transcript: string | null;
  primary_bike_id: string | null;
  related_bike_ids: string[];
  content_type: ContentType;
  status: "active" | "archived";
  updated_at: string;
};

const BIKE_ID_RE = /^[a-z0-9][a-z0-9_-]{0,63}$/;
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const text = (v: unknown, max = 8000) => typeof v === "string" ? v.trim().slice(0, max) : "";
const normalized = (v: string) => v.replace(/\s+/g, " ").trim().toLocaleLowerCase("pt-BR");

export function slugifyEditorialTitle(title: string): string {
  return title.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/g, "");
}

export function validYoutubeId(id: unknown): id is string {
  return typeof id === "string" && YOUTUBE_ID_RE.test(id);
}

export function validBikeId(id: unknown): id is string {
  return typeof id === "string" && BIKE_ID_RE.test(id);
}

export function validEditorialSlug(slug: unknown): slug is string {
  return typeof slug === "string" && slug.length <= 120 && SLUG_RE.test(slug);
}

/** Only typed blocks survive AI output. Arbitrary HTML, links and scripts are never rendered. */
export function parseArticleBlocks(raw: unknown): ArticleBlock[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 40).flatMap((item): ArticleBlock[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const b = item as Record<string, unknown>;
    if (!BLOCK_TYPES.includes(b.type as BlockType)) return [];
    const block: ArticleBlock = { type: b.type as BlockType };
    if (text(b.heading, 160)) block.heading = text(b.heading, 160);
    if (text(b.text, 5000)) block.text = text(b.text, 5000);
    if (text(b.sourceExcerpt, 1200)) block.sourceExcerpt = text(b.sourceExcerpt, 1200);
    if (validBikeId(b.bikeId)) block.bikeId = b.bikeId;
    if (Array.isArray(b.bikeIds)) block.bikeIds = b.bikeIds.filter(validBikeId).slice(0, 3);
    if (validYoutubeId(b.videoId)) block.videoId = b.videoId;
    if (/^[a-z0-9-]{1,80}$/.test(text(b.toolSlug, 80))) block.toolSlug = text(b.toolSlug, 80);
    if (/^[0-9a-f-]{36}$/i.test(text(b.articleId, 36))) block.articleId = text(b.articleId, 36);
    if (b.planned === true) block.planned = true;
    return [block];
  });
}

export function parseFaq(raw: unknown): ArticleFaq[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, 12).flatMap((item): ArticleFaq[] => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const f = item as Record<string, unknown>;
    const question = text(f.question, 240);
    const answer = text(f.answer, 1200);
    const sourceExcerpt = text(f.sourceExcerpt, 1200);
    return question && answer ? [{ question, answer, sourceExcerpt }] : [];
  });
}

/**
 * Returns only problems that make an article impossible to publish. Everything else is
 * repaired automatically by `autoRepairArticle` — validation never becomes human work.
 */
export function validateArticleForPublication(
  article: Pick<EditorialArticle, "title" | "slug" | "video_id" | "primary_bike_id" | "related_bike_ids" | "blocks">,
  transcript: string,
  knownBikeIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  if (article.title.trim().length < 10) errors.push("Título muito curto.");
  if (!validEditorialSlug(article.slug)) errors.push("Endereço inválido.");
  if (!validYoutubeId(article.video_id)) errors.push("Vídeo de origem inválido.");
  if (normalized(transcript).length < 200) errors.push("Transcrição completa é obrigatória.");
  if (article.primary_bike_id && !knownBikeIds.has(article.primary_bike_id)) errors.push("Bike principal desconhecida.");
  const sections = (article.blocks ?? []).filter((b) => b.type === "text" && b.text?.trim());
  if (sections.length < 2) errors.push("Artigo sem corpo suficiente.");
  return errors;
}

const GENERIC_HEADING = /^(se[cç][aã]o|section|bloco|texto)?\s*\d*$/i;
export const VIDEO_META_RE = /\b(n[eo]ste? v[íi]deo|n[oa] v[íi]deo|o v[íi]deo (mostra|aborda|apresenta|explica|detalha)|durante o v[íi]deo|a grava[cç][aã]o|o conte[úu]do apresenta|apresentad[oa]s? no v[íi]deo)\b/i;
/** Editorial prose must never point back to the transcript or a third-person Vitale review. */
export const SOURCE_DISTANCE_RE = /\b(?:na|pela|segundo a|conforme a) avalia[cç][aã]o (?:da vitale|pr[áa]tica|do v[íi]deo)|\b(?:a|o) (?:transcri[cç][aã]o|material avaliad[oa]|material analisad[oa]|material fornecid[oa]|avalia[cç][aã]o da vitale)\b|\ba avalia[cç][aã]o (?:indica|aponta|ressalta|mostra|descreve)|\b(?:dados|informa[cç][õo]es) fornecid[oa]s? (?:na transcri[cç][aã]o|pelo v[íi]deo)|\b(?:configura[cç][õo]es|modelos) avaliad[oa]s?\b/i;
export function hasEditorialDistance(value: string): boolean {
  return /\b(?:v[íi]deo|transcri[cç][aã]o)\b/i.test(value) || SOURCE_DISTANCE_RE.test(value);
}

/** Removes sentences with prices (commercial data comes only from entities) and any link. */
export function sanitizeEditorialText(value: string): string {
  return value
    .replace(/\[([^\]]+)\]\((?:[^)]+)\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, "")
    .split(/\n/).map((line) => line.replace(/[^.!?\n]*R\$\s*\d[^.!?\n]*[.!?]?/g, "").replace(/\s{2,}/g, " ").trimEnd())
    .join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function clip(value: string, max: number): string {
  const v = value.replace(/\s+/g, " ").trim();
  if (v.length <= max) return v;
  const cut = v.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).replace(/[\s,;:.-]+$/, "")}…`;
}

/** Deterministic QA: fixes what can be fixed, drops what cannot be sustained. */
export function autoRepairArticle<T extends Pick<EditorialArticle, "title" | "slug" | "summary" | "blocks" | "faq" | "seo_title" | "meta_description" | "og_title" | "og_description" | "og_image_url">>(
  article: T, ogFallback: string,
): T {
  const title = article.title.replace(/\s+/g, " ").trim();
  const summary = sanitizeEditorialText(article.summary ?? "");
  const blocks: ArticleBlock[] = [];
  for (const block of article.blocks ?? []) {
    if (["hero", "summary"].includes(block.type)) continue; // the lead is the summary
    if (block.type === "text" || block.type === "pros_cons") {
      const text = sanitizeEditorialText(block.text ?? "");
      if (!text) continue;
      const heading = (block.heading ?? "").trim();
      const previous = blocks[blocks.length - 1];
      if ((!heading || GENERIC_HEADING.test(heading)) && previous?.type === "text" && blocks.length) {
        previous.text = `${previous.text}\n\n${text}`; continue;
      }
      blocks.push({ type: "text", ...(heading && !GENERIC_HEADING.test(heading) ? { heading } : {}), text,
        ...(block.sourceExcerpt ? { sourceExcerpt: block.sourceExcerpt } : {}), ...(block.planned ? { planned: true } : {}) });
      continue;
    }
    blocks.push(block);
  }
  const faq = (article.faq ?? []).map((f) => ({ ...f, answer: sanitizeEditorialText(f.answer ?? "") }))
    .filter((f) => f.question?.trim() && f.answer.trim()).slice(0, 6);
  const firstText = blocks.find((b) => b.type === "text")?.text ?? "";
  let seo = (article.seo_title ?? "").trim();
  if (seo.length < 20 || seo.length > 70) seo = clip(title, 70);
  if (seo.length < 20) seo = clip(`${title} | Vitale Mobilidade`, 70);
  let meta = (article.meta_description ?? "").replace(/\s+/g, " ").trim();
  if (meta.length < 70 || meta.length > 170) meta = clip(`${summary} ${firstText.replace(/[#*>|-]/g, " ")}`, 160);
  return {
    ...article, title, summary, blocks, faq,
    slug: validEditorialSlug(article.slug) ? article.slug : slugifyEditorialTitle(title),
    seo_title: seo, meta_description: meta,
    og_title: (article.og_title ?? "").trim() || title,
    og_description: clip((article.og_description ?? "").trim() || meta, 300),
    og_image_url: article.og_image_url?.startsWith("https://") ? article.og_image_url : ogFallback,
  };
}

/** Editor representation: the article body as continuous markdown (## = H2, ### = H3). */
export function blocksToMarkdown(blocks: ArticleBlock[]): string {
  return (blocks ?? []).filter((b) => b.type === "text" && b.text?.trim())
    .map((b) => `${b.heading ? `## ${b.heading}\n\n` : ""}${b.text!.trim()}`).join("\n\n");
}

export function markdownToSections(markdown: string): ArticleBlock[] {
  const out: ArticleBlock[] = [];
  let current: ArticleBlock | null = null;
  for (const line of markdown.replace(/\r\n/g, "\n").split("\n")) {
    const h2 = line.match(/^##\s+(.+?)\s*$/);
    if (h2 && !line.startsWith("###")) {
      if (current) out.push(current);
      current = { type: "text", heading: h2[1].slice(0, 160), text: "" }; continue;
    }
    if (/^#\s+/.test(line)) continue; // title is the only H1
    if (!current) current = { type: "text", text: "" };
    current.text = `${current.text}${current.text ? "\n" : ""}${line}`;
  }
  if (current) out.push(current);
  return out.map((b) => ({ ...b, text: (b.text ?? "").trim().slice(0, 8000) })).filter((b) => b.text);
}

/** Whitelisted AI output; it never supplies status, published_at or affiliate URLs. */
export function parseCompilerOutput(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const v = raw as Record<string, unknown>;
  const title = text(v.title, 200);
  if (!title) return null;
  return {
    title,
    slug: validEditorialSlug(v.slug) ? v.slug : slugifyEditorialTitle(title),
    summary: text(v.summary, 1200),
    summary_source_excerpt: text(v.summarySourceExcerpt, 1200),
    seo_title: text(v.seoTitle, 70),
    meta_description: text(v.metaDescription, 170),
    og_title: text(v.ogTitle, 160),
    og_description: text(v.ogDescription, 300),
    blocks: parseArticleBlocks(v.blocks),
    faq: parseFaq(v.faq),
    related_bike_ids: Array.isArray(v.relatedBikeIds) ? v.relatedBikeIds.filter(validBikeId).slice(0, 12) : [],
  };
}
