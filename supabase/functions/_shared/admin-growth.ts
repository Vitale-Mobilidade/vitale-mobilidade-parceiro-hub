export type QuizBikeMetric = {
  bikeId: string;
  name: string;
  primaryRecommendations: number;
  secondaryRecommendations: number;
  quizOfferClicks: number;
};

function metricCount(value: unknown) {
  const count =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^(0|[1-9]\d*)$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
}

export function parseQuizBikeMetrics(payload: unknown): QuizBikeMetric[] | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const bikes = (payload as Record<string, unknown>).bikes;
  if (!Array.isArray(bikes)) return null;

  const parsed: QuizBikeMetric[] = [];
  for (const row of bikes) {
    if (!row || typeof row !== "object" || Array.isArray(row)) return null;
    const item = row as Record<string, unknown>;
    const primaryRecommendations = metricCount(item.primaryRecommendations);
    const secondaryRecommendations = metricCount(item.secondaryRecommendations);
    const quizOfferClicks = metricCount(item.quizOfferClicks);
    if (
      typeof item.bikeId !== "string" ||
      !/^[a-z0-9_]{1,64}$/.test(item.bikeId) ||
      typeof item.name !== "string" ||
      !item.name.trim() ||
      primaryRecommendations === null ||
      secondaryRecommendations === null ||
      quizOfferClicks === null
    ) return null;
    parsed.push({
      bikeId: item.bikeId,
      name: item.name,
      primaryRecommendations,
      secondaryRecommendations,
      quizOfferClicks,
    });
  }
  return parsed;
}
