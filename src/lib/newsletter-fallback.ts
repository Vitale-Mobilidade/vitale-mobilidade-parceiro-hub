import type {
  NewsletterEvidence,
  NewsletterDraft,
} from "./newsletter-writer.server";
/** Only already published summaries are copied. Rejected drafts/transcripts are never fallback copy. */
export function sourceNewsletterFallback(
  sources: NewsletterEvidence[],
): NewsletterDraft {
  const articles = sources.filter((s) => s.id.startsWith("article-"));
  const lead = articles[0]?.title ?? sources[0]?.title ?? "Conteúdos da Vitale";
  const subject = `O Giro da Vitale: ${lead}`.slice(0, 70);
  const topics = articles
    .slice(0, 2)
    .map((s) => s.title)
    .join("; ");
  return {
    subject,
    headline: `No Giro: ${lead}`.slice(0, 100),
    preheader: `Nesta seleção: ${articles[1]?.title ?? lead}`.slice(0, 150),
    opening: [
      `No Giro de hoje: ${topics || lead}. No canal: ${sources.find((s) => s.id.startsWith("video-"))?.title ?? lead}. Os links de cada seção levam aos conteúdos completos.`,
    ],
    sections: sources.map((source) => ({
      id: source.id,
      paragraphs: [
        (source.publishedSummary?.trim() &&
        source.publishedSummary.trim().length <= 880
          ? `Resumo publicado: ${source.publishedSummary.trim()}`
          : undefined) ||
          `No ${source.id.startsWith("video-") ? "canal" : "acervo"} da Vitale: ${source.title}. O conteúdo completo está no link desta seção.`,
      ],
      bullets: [],
      evidence: [],
    })),
  };
}
