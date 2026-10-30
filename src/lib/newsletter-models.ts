import type { NewsletterCandidate } from "./newsletter-curation";
export type NewsletterBikeIdentity = { bikeId: string; name: string };
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
/** Editorial family only: never changes catalog identity, specs or destinations. */
export function newsletterModelFamily(id: string) {
  const tokens = normalize(id).split(" ");
  const code = tokens.findIndex((s) => /^[a-z]+\d+$/.test(s));
  return code < 0 ? normalize(id) : tokens.slice(0, code + 1).join(" ");
}
/** Zero for unseen families; otherwise prefer the least recent when rotation is exhausted. */
export function newsletterBikeRecencyPenalty(id: string, recentIds: string[]) {
  const family = newsletterModelFamily(id);
  const index = recentIds.findIndex((recent) => newsletterModelFamily(recent) === family);
  return index < 0 ? 0 : recentIds.length - index;
}
export function newsletterCandidateBikeIds(
  item: NewsletterCandidate,
  catalog: NewsletterBikeIdentity[] = [],
) {
  const explicit = [
    item.primaryBikeId,
    ...(item.relatedBikeIds ?? []),
    ...(item.bikeIds ?? []),
  ].filter((id): id is string => Boolean(id));
  const title = ` ${normalize(item.title)} `;
  const named = catalog
    .filter((b) => title.includes(` ${normalize(b.name)} `))
    .map((b) => b.bikeId);
  return [...new Set([...explicit, ...named])];
}
export function newsletterCandidateModels(
  item: NewsletterCandidate,
  catalog: NewsletterBikeIdentity[] = [],
) {
  const ids = newsletterCandidateBikeIds(item, catalog);
  // Codes in titles still rotate when old content lost its catalog association.
  const titleCodes = normalize(item.title).match(/\b[a-z]+\d+\b/g) ?? [];
  return [...new Set([...ids.map(newsletterModelFamily), ...titleCodes])];
}
