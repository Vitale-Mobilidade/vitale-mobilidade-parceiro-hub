// `today` is the São Paulo calendar day, independent of the browser timezone.
export function growthPresetRequest(preset: string, today: string) {
  const date = new Date(`${today}T12:00:00Z`);
  const shift = (days: number) =>
    new Date(date.getTime() + days * 86400000).toISOString().slice(0, 10);

  if (preset === "this-month") {
    return { startDate: `${today.slice(0, 7)}-01`, endDate: today };
  }
  if (preset === "last-month") {
    const lastDay = shift(-date.getUTCDate());
    return { startDate: `${lastDay.slice(0, 7)}-01`, endDate: lastDay };
  }
  if (preset === "last-week") {
    const daysSinceMonday = (date.getUTCDay() + 6) % 7;
    return {
      startDate: shift(-daysSinceMonday - 7),
      endDate: shift(-daysSinceMonday - 1),
    };
  }
  if (preset === "14") return { startDate: shift(-13), endDate: today };
  if (preset === "yesterday") {
    const yesterday = shift(-1);
    return { startDate: yesterday, endDate: yesterday };
  }
  return { rangeDays: Number(preset) };
}