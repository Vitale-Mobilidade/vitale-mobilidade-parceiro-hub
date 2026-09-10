/**
 * Camada diária do Radar de Preços (lado servidor).
 *
 * Uma execução bem-sucedida CONFIRMA o preço vigente das bikes presentes no
 * snapshot. Registramos isso por bike/dia (America/Sao_Paulo) sem gerar IA e
 * sem quebrar o sync caso a gravação analítica falhe.
 */

export interface DailyCandidate {
  bike_id: string;
  price: number;
  changed: boolean;
}

export interface DailyRow {
  bike_id: string;
  day: string;
  close: number;
  low: number;
  high: number;
  verified_runs: number;
  last_verified_at: string;
  changed: boolean;
  verification: "observed_change" | "confirmed_unchanged";
}

export interface DailyExisting {
  bike_id: string;
  day: string;
  low: number | string;
  high: number | string;
  verified_runs: number;
  changed: boolean;
}

/** Data no fuso de São Paulo (YYYY-MM-DD). */
export function saoPauloDay(at: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/**
 * Monta as linhas do upsert diário. Mantém mínima/máxima do dia acumuladas e
 * incrementa a contagem de verificações.
 */
export function buildDailyRows(
  candidates: DailyCandidate[],
  existing: DailyExisting[],
  at: Date,
): DailyRow[] {
  const day = saoPauloDay(at);
  const prev = new Map(existing.filter((e) => e.day === day).map((e) => [e.bike_id, e]));
  const rows: DailyRow[] = [];
  for (const c of candidates) {
    if (!(c.price > 0)) continue;
    const before = prev.get(c.bike_id);
    const low = before ? Math.min(Number(before.low), c.price) : c.price;
    const high = before ? Math.max(Number(before.high), c.price) : c.price;
    const changed = c.changed || before?.changed === true;
    rows.push({
      bike_id: c.bike_id,
      day,
      close: c.price,
      low,
      high,
      verified_runs: (before?.verified_runs ?? 0) + 1,
      last_verified_at: at.toISOString(),
      changed,
      verification: changed ? "observed_change" : "confirmed_unchanged",
    });
  }
  return rows;
}
