/** Pure editorial contract shared by the browser preview and the privileged API. */
export const ARTICLE_STATUSES = ["draft", "generated", "validation_error", "ready", "published", "archived"] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];
export const CONTENT_TYPES = ["test", "comparison", "guide", "tips", "economy", "other"] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];
export const BLOCK_TYPES = ["hero", "summary", "text", "video", "radar", "specs", "pros_cons", "faq", "related", "quiz", "comparator", "cta"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export type ArticleBlock = {
  type: BlockType;
  heading?: string;
  text?: string;
  sourceExcerpt?: string;
  bikeId?: string;
  videoId?: string;
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
    if (validYoutubeId(b.videoId)) block.videoId = b.videoId;
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

/** Returns blocking problems. Human review is still mandatory: textual grounding is necessary, not sufficient. */
export function validateArticleForPublication(
  article: Pick<EditorialArticle, "title" | "slug" | "summary" | "summary_source_excerpt" | "seo_title" | "meta_description" | "og_title" | "og_description" | "og_image_url" | "video_id" | "primary_bike_id" | "related_bike_ids" | "blocks" | "faq">,
  transcript: string,
  knownBikeIds: ReadonlySet<string>,
): string[] {
  const errors: string[] = [];
  if (article.title.trim().length < 10) errors.push("Título editorial muito curto.");
  if (!validEditorialSlug(article.slug)) errors.push("Slug inválido.");
  if (article.summary.trim().length < 30) errors.push("Resumo insuficiente.");
  if (!article.summary_source_excerpt || !normalized(transcript).includes(normalized(article.summary_source_excerpt))) {
    errors.push("Resumo sem trecho verificável da transcrição.");
  } else {
    for (const number of article.summary.match(/\d+(?:[.,]\d+)*/g) ?? []) {
      if (!article.summary_source_excerpt.includes(number)) errors.push(`Resumo: número ${number} sem apoio no trecho citado.`);
    }
  }
  if (article.seo_title.trim().length < 20 || article.seo_title.length > 70) errors.push("SEO title deve ter 20 a 70 caracteres.");
  if (article.meta_description.trim().length < 70 || article.meta_description.length > 170) errors.push("Meta description deve ter 70 a 170 caracteres.");
  if (!article.og_title.trim() || !article.og_description.trim()) errors.push("Open Graph incompleto.");
  if (article.og_image_url) {
    try {
      const url = new URL(article.og_image_url);
      if (url.protocol !== "https:") errors.push("Imagem OG precisa usar HTTPS.");
    } catch { errors.push("URL da imagem OG inválida."); }
  } else errors.push("Imagem Open Graph ausente.");
  if (!validYoutubeId(article.video_id)) errors.push("Vídeo de origem inválido.");
  if (normalized(transcript).length < 200) errors.push("Transcrição completa é obrigatória.");
  if (article.primary_bike_id && !knownBikeIds.has(article.primary_bike_id)) errors.push("Bike principal desconhecida.");
  for (const id of article.related_bike_ids) if (!knownBikeIds.has(id)) errors.push(`Bike relacionada desconhecida: ${id}.`);
  if (!Array.isArray(article.blocks) || article.blocks.length < 2) errors.push("Artigo precisa de blocos editoriais.");
  const source = normalized(transcript);
  for (const [i, block] of (article.blocks ?? []).entries()) {
    if (!BLOCK_TYPES.includes(block.type)) { errors.push(`Bloco ${i + 1}: tipo inválido.`); continue; }
    if (["hero", "summary", "text", "pros_cons"].includes(block.type)) {
      if (!block.text?.trim()) errors.push(`Bloco ${i + 1}: texto vazio.`);
      if (!block.sourceExcerpt || !source.includes(normalized(block.sourceExcerpt))) {
        errors.push(`Bloco ${i + 1}: trecho de fonte ausente ou não encontrado na transcrição.`);
      } else {
        const numbers = block.text?.match(/\d+(?:[.,]\d+)*/g) ?? [];
        for (const number of numbers) {
          if (!block.sourceExcerpt.includes(number)) errors.push(`Bloco ${i + 1}: número ${number} sem apoio no trecho citado.`);
        }
      }
    }
    if (["radar", "specs", "comparator", "cta"].includes(block.type) &&
      (!block.bikeId || !knownBikeIds.has(block.bikeId))) {
      errors.push(`Bloco ${i + 1}: bike_id válido é obrigatório.`);
    }
    if (block.type === "video" && block.videoId !== article.video_id) errors.push(`Bloco ${i + 1}: vídeo não corresponde à origem.`);
  }
  for (const [i, f] of (article.faq ?? []).entries()) {
    if (!f.question?.trim() || !f.answer?.trim() || !f.sourceExcerpt || !source.includes(normalized(f.sourceExcerpt))) {
      errors.push(`FAQ ${i + 1}: resposta sem trecho verificável da transcrição.`);
    }
  }
  return [...new Set(errors)];
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
