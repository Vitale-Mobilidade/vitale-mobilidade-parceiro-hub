import { slugifyEditorialTitle, validEditorialSlug, type ArticleBlock, type ArticleFaq, type ContentType } from "./editorial-contract.ts";
import type { PlannedModule } from "./editorial-foundation.ts";

export type BikeCandidate = { bike_id: string; name: string; image_url?: string | null; aliases?: string[] };
export type BikeDetection = { primaryBikeId: string | null; relatedBikeIds: string[]; ambiguous: boolean };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

/** Commercial suffixes that the catalog appends but people rarely say ("duas baterias"). */
const SUFFIXES = /\s+(duas baterias|2 baterias|bateria dupla|dupla bateria)$/;

/**
 * Prefer a complete variant (V9 Max 20Ah) over a shorter name contained in it (V9 Max).
 * In comparisons, the model named first in the title is the primary bike; the others are related.
 */
export function detectEditorialBikes(title: string, transcript: string, bikes: BikeCandidate[]): BikeDetection {
  const titleWords = ` ${normalize(title)} `;
  const transcriptWords = ` ${normalize(transcript)} `;
  const matches = bikes.map((bike) => {
    const base = [bike.name, bike.bike_id.replace(/_/g, " "), ...(bike.aliases ?? [])].map(normalize);
    const names = [...new Set([...base, ...base.map((n) => n.replace(SUFFIXES, ""))])].filter((name) => name.length >= 3);
    const best = names.reduce((acc, name) => {
      const at = titleWords.indexOf(` ${name} `);
      const inTranscript = transcriptWords.includes(` ${name} `);
      const score = at >= 0 ? 100 + name.length : inTranscript ? 10 + name.length / 100 : 0;
      return score > acc.score ? { score, name, at } : acc;
    }, { score: 0, name: "", at: -1 });
    return { id: bike.bike_id, ...best };
  }).filter((item) => item.score > 0);
  const selected = matches.filter((item) => !matches.some((other) =>
    other !== item && other.name.length > item.name.length && other.name.includes(item.name) &&
    (other.score >= 100) === (item.score >= 100)));
  const inTitle = selected.filter((item) => item.score >= 100).sort((a, b) => a.at - b.at);
  const rest = selected.filter((item) => item.score < 100).sort((a, b) => b.score - a.score);
  const ordered = [...inTitle, ...rest];
  const primary = ordered[0]?.id ?? null;
  return { primaryBikeId: primary, relatedBikeIds: ordered.slice(1, 8).map((i) => i.id), ambiguous: false };
}

export function detectContentType(title: string): ContentType {
  const text = normalize(title);
  if (/\b(vs|versus|comparativo|comparando)\b/.test(text)) return "comparison";
  if (/\b(guia|como escolher|tutorial)\b/.test(text)) return "guide";
  if (/\b(dicas|erros|cuidados)\b/.test(text)) return "tips";
  if (/\b(economia|economizar|custo)\b/.test(text)) return "economy";
  return "test";
}

export const YOUTUBE_THUMBNAILS = [
  { name: "maxresdefault", width: 1280, height: 720 },
  { name: "sddefault", width: 640, height: 480 },
  { name: "hqdefault", width: 480, height: 360 },
  { name: "mqdefault", width: 320, height: 180 },
] as const;

export function youtubeThumbnailUrl(id: string, variant: string): string {
  return `https://i.ytimg.com/vi/${id}/${variant}.jpg`;
}

export const EDITORIAL_OG_FALLBACK = "https://vitalemobilidade.com/vitale-hero-v2-1280.webp";

export function videoHeading(contentType?: ContentType): string {
  return contentType === "comparison" ? "Assista ao comparativo completo"
    : contentType === "guide" || contentType === "tips" ? "Veja as explicações em vídeo"
    : "Veja o teste completo em vídeo";
}

/**
 * Deterministic page layout. Only editorial text comes from the writer; video, Radar,
 * comparison, offer, Quiz and FAQ are connected from real entities in fixed, natural positions.
 */
export function layoutArticle(input: {
  sections: ArticleBlock[]; videoId: string; bikeId: string | null; relatedBikeIds?: string[];
  contentType?: ContentType; offerBikeIds: ReadonlySet<string>; hasFaq: boolean;
  plannedModules?: PlannedModule[];
}): ArticleBlock[] {
  const sections = input.sections.filter((b) => b.type === "text" && b.text?.trim());
  if (input.plannedModules) {
    const out: ArticleBlock[] = [];
    sections.forEach((section, i) => {
      out.push({ ...section, planned: true });
      for (const module of input.plannedModules!.filter((item) => item.afterSection === i)) {
        if (module.type === "faq" && !input.hasFaq) continue;
        if (module.type === "radar") {
          for (const bikeId of module.bikeIds.filter((id) => input.offerBikeIds.has(id))) out.push({ type: "radar", bikeId, planned: true });
        } else if (module.type === "comparison" && module.bikeIds.length >= 2) {
          out.push({ type: "comparator", bikeId: module.bikeIds[0], bikeIds: module.bikeIds.slice(0, 2), planned: true });
        } else if (module.type === "video") out.push({ type: "video", videoId: input.videoId, planned: true });
        else if (module.type === "quiz") out.push({ type: "quiz", planned: true });
        else if (module.type === "tool" && module.toolSlug) out.push({ type: "tool", toolSlug: module.toolSlug, planned: true });
        else if (module.type === "article_link" && module.articleId) out.push({ type: "related", articleId: module.articleId, planned: true });
        else if (module.type === "faq") out.push({ type: "faq", planned: true });
      }
    });
    return out;
  }
  const n = sections.length;
  const compared = input.bikeId ? [input.bikeId, ...(input.relatedBikeIds ?? [])].slice(0, 3) : [];
  const isComparison = input.contentType === "comparison" && compared.length >= 2;
  const radarIds = (isComparison ? compared.slice(0, 2) : input.bikeId ? [input.bikeId] : [])
    .filter((id) => input.offerBikeIds.has(id));
  const comparatorAt = isComparison ? Math.min(1, n - 1) : -1;
  const radarAt = radarIds.length ? Math.min(n - 1, Math.max(Math.floor(n * 0.45), comparatorAt + 1)) : -1;
  const videoAt = Math.min(n - 1, radarAt === 2 ? 3 : 2);
  const quizAt = input.bikeId || ["comparison", "guide", "test"].includes(input.contentType ?? "")
    ? Math.min(n - 1, Math.max(radarAt + 1, Math.floor(n * 0.7))) : -1;
  const out: ArticleBlock[] = [];
  sections.forEach((section, i) => {
    out.push(section);
    if (i === comparatorAt) out.push({ type: "comparator", bikeId: input.bikeId!, heading: "Comparação lado a lado" });
    if (i === radarAt) for (const id of radarIds) out.push({ type: "radar", bikeId: id });
    if (i === videoAt) out.push({ type: "video", videoId: input.videoId, heading: videoHeading(input.contentType) });
    if (i === quizAt) out.push({ type: "quiz" });
  });
  if (!out.some((b) => b.type === "video")) out.push({ type: "video", videoId: input.videoId, heading: videoHeading(input.contentType) });
  if (radarAt >= n) for (const id of radarIds) out.push({ type: "radar", bikeId: id });
  if (input.hasFaq) out.push({ type: "faq" });
  if (quizAt < 0 && (input.bikeId || ["comparison", "guide", "test"].includes(input.contentType ?? ""))) out.push({ type: "quiz" });
  return out;
}

/** Back-compat helper used by tests and the generator: layout + metadata defaults. */
export function completeEditorialDraft(input: {
  title: string; slug?: string | null; summary: string; seoTitle: string; metaDescription: string;
  ogTitle: string; ogDescription: string; blocks: ArticleBlock[]; faq: ArticleFaq[];
  videoId: string; bikeId: string | null; relatedBikeIds?: string[]; contentType?: ContentType;
  offerBikeIds: ReadonlySet<string>; ogImageUrl: string | null; relatedArticleIds: string[];
  plannedModules?: PlannedModule[];
}) {
  const title = input.title.trim();
  const description = (input.metaDescription.trim() || input.summary.trim()).slice(0, 170);
  const faq = input.faq.filter((item) => item.question.trim() && item.answer.trim());
  return {
    title,
    slug: validEditorialSlug(input.slug) ? input.slug : slugifyEditorialTitle(title),
    seo_title: (input.seoTitle.trim() || `${title} | Vitale Mobilidade`).slice(0, 70),
    meta_description: description,
    og_title: input.ogTitle.trim() || title,
    og_description: input.ogDescription.trim() || description,
    og_image_url: input.ogImageUrl || EDITORIAL_OG_FALLBACK,
    blocks: layoutArticle({ sections: input.blocks, videoId: input.videoId, bikeId: input.bikeId,
      relatedBikeIds: input.relatedBikeIds, contentType: input.contentType, offerBikeIds: input.offerBikeIds, hasFaq: faq.length > 0,
      plannedModules: input.plannedModules }),
    faq,
    related_article_ids: input.relatedArticleIds,
  };
}
