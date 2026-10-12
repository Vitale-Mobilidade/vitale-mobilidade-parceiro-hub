export function saoPauloDay(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
function validDay(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value
  );
}
export function growthRange(
  body: { rangeDays?: unknown; startDate?: unknown; endDate?: unknown },
  now = new Date(),
) {
  const today = saoPauloDay(now);
  const shift = (day: string, days: number) =>
    new Date(Date.parse(`${day}T12:00:00Z`) + days * 86400000)
      .toISOString()
      .slice(0, 10);
  const requested = Number(body.rangeDays);
  const days = [1, 7, 30, 90].includes(requested) ? requested : 30;
  const startDate = body.startDate ?? shift(today, 1 - days);
  const endDate = body.endDate ?? today;
  if (
    !validDay(startDate) ||
    !validDay(endDate) ||
    startDate > endDate ||
    endDate > today
  )
    throw new Error("Período inválido. Confira as datas.");
  const rangeDays =
    Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000) + 1;
  if (rangeDays > 366) throw new Error("Selecione no máximo 366 dias.");
  const untilDay = shift(endDate, 1);
  // São Paulo has used UTC−03 continuously since 2019. Reject earlier ranges.
  if (startDate < "2020-01-01")
    throw new Error("Selecione datas a partir de 2020.");
  return {
    startDate,
    endDate,
    rangeDays,
    since: `${startDate}T00:00:00-03:00`,
    until: `${untilDay}T00:00:00-03:00`,
    untilDay,
  };
}
