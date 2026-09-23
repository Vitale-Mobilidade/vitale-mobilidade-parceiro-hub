import { slugifyEditorialTitle, validEditorialSlug, type ArticleBlock, type ArticleFaq, type ContentType } from "./editorial-contract.ts";

export type BikeCandidate = { bike_id: string; name: string; image_url?: string | null; aliases?: string[] };
export type BikeDetection = { primaryBikeId: string | null; relatedBikeIds: string[]; ambiguous: boolean };

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

/** Prefer a complete variant (V9 Max 20Ah) over a shorter name contained in it (V9 Max). */
export function detectEditorialBikes(title: string, transcript: string, bikes: BikeCandidate[]): BikeDetection {
  const titleWords = ` ${normalize(title)} `;
  const transcriptWords = ` ${normalize(transcript)} `;
  const matches = bikes.map((bike) => {
    const names = [bike.name, bike.bike_id.replace(/_/g, " "), ...(bike.aliases ?? [])].map(normalize)
      .filter((name) => name.length >= 3);
    const best = names.reduce((acc, name) => {
      const inTitle = titleWords.includes(` ${name} `);
      const inTranscript = transcriptWords.includes(` ${name} `);
      const score = inTitle ? 100 + name.length : inTranscript ? 10 + name.length / 100 : 0;
      return score > acc.score ? { score, name } : acc;
    }, { score: 0, name: "" });
    return { id: bike.bike_id, ...best };
  }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
  const selected = matches.filter((item) => !matches.some((other) =>
    other !== item && other.score > item.score && other.name.includes(item.name) && other.name !== item.name));
  const titleMatches = selected.filter((item) => item.score >= 100);
  const ambiguous = titleMatches.length > 1 && titleMatches[0].score - titleMatches[1].score < 10;
  return { primaryBikeId: ambiguous ? null : selected[0]?.id ?? null,
    relatedBikeIds: selected.slice(0, 8).map((item) => item.id).filter((id) => id !== (ambiguous ? null : selected[0]?.id)), ambiguous };
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

export function completeEditorialDraft(input: {
  title: string; slug?: string | null; summary: string; seoTitle: string; metaDescription: string;
  ogTitle: string; ogDescription: string; blocks: ArticleBlock[]; faq: ArticleFaq[];
  videoId: string; bikeId: string | null; relatedBikeIds?: string[]; contentType?: ContentType; hasCurrentOffer: boolean;
  addCommercialBlocks?: boolean;
  ogImageUrl: string | null; relatedArticleIds: string[];
}) {
  const title = input.title.trim();
  const summary = input.summary.trim();
  const description = (input.metaDescription.trim() || summary).slice(0, 170);
  const blocks = input.blocks.filter((block) => {
    if (["summary", "text", "pros_cons"].includes(block.type)) return Boolean(block.text?.trim());
    if (["radar", "cta"].includes(block.type)) return Boolean(input.bikeId && input.hasCurrentOffer);
    if (block.type === "comparator") return Boolean(input.bikeId && input.relatedBikeIds?.length);
    if (block.type === "specs") return Boolean(input.bikeId);
    return true;
  }).map((block) => block.type === "video" ? { ...block, videoId: input.videoId } :
    input.bikeId && ["radar", "specs", "cta", "comparator"].includes(block.type)
      ? { ...block, bikeId: input.bikeId } : block);
  if (!blocks.some((block) => block.type === "video")) {
    blocks.splice(Math.min(2, blocks.length), 0, { type: "video", heading: "Veja o teste original", videoId: input.videoId });
  }
  if (input.addCommercialBlocks !== false && input.bikeId && input.hasCurrentOffer && !blocks.some((block) => block.type === "radar")) {
    const firstEditorial = blocks.findIndex((block) => block.type === "text");
    blocks.splice(Math.min(blocks.length, Math.max(2, firstEditorial + 1)), 0,
      { type: "radar", heading: "O preço atual está bom?", bikeId: input.bikeId });
  }
  if (input.addCommercialBlocks !== false && input.bikeId && input.hasCurrentOffer && !blocks.some((block) => block.type === "cta")) {
    blocks.push({ type: "cta", bikeId: input.bikeId });
  }
  if (input.relatedArticleIds.length && !blocks.some((block) => block.type === "related")) {
    blocks.push({ type: "related", heading: "Continue sua pesquisa" });
  }
  if (input.addCommercialBlocks !== false && input.contentType === "comparison" && input.bikeId && input.relatedBikeIds?.length &&
    !blocks.some((block) => block.type === "comparator")) {
    blocks.push({ type: "comparator", bikeId: input.bikeId, heading: "Compare os modelos citados" });
  }
  return {
    title,
    slug: validEditorialSlug(input.slug) ? input.slug : slugifyEditorialTitle(title),
    seo_title: (input.seoTitle.trim() || `${title} | Vitale Mobilidade`).slice(0, 70),
    meta_description: description,
    og_title: input.ogTitle.trim() || title,
    og_description: input.ogDescription.trim() || description,
    og_image_url: input.ogImageUrl || EDITORIAL_OG_FALLBACK,
    blocks,
    faq: input.faq.filter((item) => item.question.trim() && item.answer.trim() && item.sourceExcerpt.trim()),
    related_article_ids: input.relatedArticleIds,
  };
}
