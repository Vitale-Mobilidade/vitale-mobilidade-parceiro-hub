import { newsletterImageSchema, type NewsletterContent } from "./newsletter";
import type { NewsletterCandidate } from "./newsletter-curation";
import {
  newsletterCandidateBikeIds,
  type NewsletterBikeIdentity,
} from "./newsletter-models";

/** Contingency copy is an internal draft, never an approved edition. */
export function assertNewsletterEditorial(
  content: NewsletterContent,
  mode?: string,
) {
  const text = [
    content.subject,
    content.headline,
    content.intro,
    ...[...content.articles, content.bike, ...content.videos].flatMap((s) => [
      s.title,
      ...(s.paragraphs ?? []),
      ...(s.bullets ?? []),
    ]),
  ].join("\n");
  if (
    mode === "fallback" ||
    /Resumo publicado:|O conteúdo completo está no link desta seção\.|Os links de cada seção levam aos conteúdos completos\./i.test(
      text,
    )
  )
    throw new Error("newsletter_editorial_approval_required");
}

/** Exact offer identity: an active sibling variant cannot authorize another bike. */
export function newsletterCandidateHasOffers(
  candidate: NewsletterCandidate,
  catalog: NewsletterBikeIdentity[],
  activeIds: Set<string>,
) {
  const ids = newsletterCandidateBikeIds(candidate, catalog);
  // Model-specific content without a resolvable identity cannot be recommended.
  if (!ids.length && /\b[a-z]{1,8}\d+\b/i.test(candidate.title)) return false;
  return ids.every((id) => activeIds.has(id));
}

/** Keep the published cover when an optional newsletter derivative is unavailable. */
export function selectNewsletterArticleImage(
  ...candidates: (string | null | undefined)[]
) {
  return candidates.find(
    (value) => newsletterImageSchema.safeParse(value).success,
  );
}
export function assertNewsletterArticleImages(content: NewsletterContent) {
  if (
    content.articles.some(
      (article) => !newsletterImageSchema.safeParse(article.image).success,
    )
  )
    throw new Error("newsletter_article_image_required");
}
