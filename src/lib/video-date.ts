/** Operational fallback; the source date is preserved for factual video metadata. */
export function normalizeVideoDate<T extends { date: string | null }>(
  video: T,
  now = new Date(),
): T & { sourceDate: string | null } {
  const sourceDate = video.date;
  const valid =
    sourceDate &&
    /^\d{4}-\d{2}-\d{2}$/.test(sourceDate) &&
    Number.isFinite(Date.parse(`${sourceDate}T00:00:00Z`)) &&
    new Date(`${sourceDate}T00:00:00Z`).toISOString().slice(0, 10) ===
      sourceDate;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => parts.find((p) => p.type === type)!.value;
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  return {
    ...video,
    sourceDate,
    date: valid ? (sourceDate > today ? today : sourceDate) : null,
  };
}
