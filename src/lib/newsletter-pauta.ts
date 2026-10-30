import { excludedNewsletterMotorcycle } from "./newsletter-bike-policy";
import { compareOfferClickRelevance, offerClickPriority } from "../../supabase/functions/_shared/bike-relevance";
import { newsletterBikeRecencyPenalty, newsletterModelFamily } from "./newsletter-models";
/** Compare current offers with the most recent higher verified price, never a cherry-picked peak. */
export type NewsletterDropBike = {
  id: string;
  name: string;
  currentPrice: number;
  offerClickRank30d?: number | null;
  daily?: {
    date: string;
    close: number;
    verifiedRuns: number;
    lastVerifiedAt: string;
  }[];
};
export function selectNewsletterDrops(bikes: NewsletterDropBike[], now: Date, recentBikeIds: string[] = []) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const candidates = bikes
    .filter((b) => !excludedNewsletterMotorcycle(b.id, b.name))
    .flatMap((b) => {
      if (!Number.isFinite(b.currentPrice) || b.currentPrice <= 0) return [];
      const verified = (b.daily ?? [])
        .filter(
          (p) =>
            /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
            p.date <= today &&
            Number.isFinite(p.close) &&
            p.close > 0 &&
            p.verifiedRuns > 0 &&
            Number.isFinite(Date.parse(p.lastVerifiedAt)) &&
            Date.parse(p.lastVerifiedAt) <= now.getTime(),
        )
        .sort((a, c) => a.date.localeCompare(c.date));
      const current = verified.at(-1);
      const baseline = current
        ? verified
            .filter((p) => p.date < current.date && p.close > b.currentPrice)
            .at(-1)
        : undefined;
      if (
        !baseline ||
        !current ||
        baseline.date === current.date ||
        current.close !== b.currentPrice ||
        now.getTime() - Date.parse(current.lastVerifiedAt) > 24 * 60 * 60_000 ||
        current.close >= baseline.close
      )
        return [];
      return [
        {
          id: b.id,
          name: b.name,
          offerClickRank30d: b.offerClickRank30d,
          previous: baseline.close,
          current: current.close,
          percent: ((baseline.close - current.close) / baseline.close) * 100,
          baselineDate: baseline.date,
          verifiedAt: current.lastVerifiedAt,
        },
      ];
    })
    .sort((a, b) =>
      newsletterBikeRecencyPenalty(a.id, recentBikeIds) - newsletterBikeRecencyPenalty(b.id, recentBikeIds) ||
      ((Number.isFinite(offerClickPriority(a.offerClickRank30d)) || Number.isFinite(offerClickPriority(b.offerClickRank30d)))
        ? compareOfferClickRelevance(a, b) : 0) || b.percent - a.percent || a.id.localeCompare(b.id))
    ;
  const selected: typeof candidates = [];
  const families = new Set<string>();
  for (const candidate of candidates) {
    const family = newsletterModelFamily(candidate.id);
    if (families.has(family)) continue;
    families.add(family);
    selected.push(candidate);
    if (selected.length === 3) return selected;
  }
  for (const candidate of candidates) {
    if (selected.some((item) => item.id === candidate.id)) continue;
    selected.push(candidate);
    if (selected.length === 3) break;
  }
  return selected;
}
