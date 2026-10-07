/** Deterministic editorial selection. A large historic drop is not a fresh promotion. */
export type NewsletterDropBike = {
  id: string;
  name: string;
  currentPrice: number;
  daily?: {
    date: string;
    close: number;
    verifiedRuns: number;
    lastVerifiedAt: string;
  }[];
};
export function selectNewsletterDrops(
  bikes: NewsletterDropBike[],
  since: Date,
  now: Date,
) {
  const sinceDay = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(since);
  return bikes
    .flatMap((b) => {
      if (!Number.isFinite(b.currentPrice) || b.currentPrice <= 0) return [];
      const verified = (b.daily ?? [])
        .filter(
          (p) =>
            /^\d{4}-\d{2}-\d{2}$/.test(p.date) &&
            Number.isFinite(p.close) &&
            p.close > 0 &&
            p.verifiedRuns > 0 &&
            Number.isFinite(Date.parse(p.lastVerifiedAt)) &&
            Date.parse(p.lastVerifiedAt) <= now.getTime(),
        )
        .sort((a, c) => a.date.localeCompare(c.date));
      const baseline = verified.filter((p) => p.date < sinceDay).at(-1);
      const current = verified.at(-1);
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
          previous: baseline.close,
          current: current.close,
          percent: ((baseline.close - current.close) / baseline.close) * 100,
          baselineDate: baseline.date,
          verifiedAt: current.lastVerifiedAt,
        },
      ];
    })
    .sort((a, b) => b.percent - a.percent || a.id.localeCompare(b.id))
    .slice(0, 3);
}
