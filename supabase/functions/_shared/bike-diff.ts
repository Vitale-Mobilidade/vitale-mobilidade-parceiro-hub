/**
 * Agenda fixa do cron + diff auditável do catálogo.
 *
 * Módulo PURO (sem APIs Deno/Node): usado pelas Edge Functions e pelos testes
 * vitest do frontend.
 *
 * Agenda: toda hora no minuto :07, fuso America/Sao_Paulo. O fuso é UTC-03:00
 * fixo (sem horário de verão desde 2019) e o offset é de horas inteiras, logo o
 * alinhamento por minuto é idêntico em UTC — por isso o cálculo abaixo usa UTC.
 */

// ---------- Agenda ----------

/** Minuto fixo da agenda automática. */
export const SCHEDULE_MINUTE = 7;

/**
 * Tolerância de "vencido": o cron pode chegar alguns milissegundos antes do
 * horário exato. Sem isso, uma execução que terminou em HH:07:00.123 fazia a
 * chamada seguinte retornar {"skipped":true,"reason":"not_due_or_running"}.
 */
export const DUE_TOLERANCE_MS = 90 * 1000;

/** Próxima ocorrência de HH:07 estritamente após `from` (com folga de 30s). */
export function nextScheduledRun(from: Date): Date {
  const d = new Date(from.getTime());
  d.setUTCMinutes(SCHEDULE_MINUTE, 0, 0);
  while (d.getTime() <= from.getTime() + 30_000) {
    d.setTime(d.getTime() + 60 * 60 * 1000);
  }
  return d;
}

/** Ocorrência de HH:07 imediatamente anterior ou igual a `at` (slot programado). */
export function currentScheduledSlot(at: Date): Date {
  const d = new Date(at.getTime());
  d.setUTCMinutes(SCHEDULE_MINUTE, 0, 0);
  if (d.getTime() > at.getTime() + DUE_TOLERANCE_MS) {
    d.setTime(d.getTime() - 60 * 60 * 1000);
  }
  return d;
}

/** Está vencido? Aceita tolerância para não depender de milissegundos. */
export function isDue(nextRunAt: string | Date | null | undefined, now: Date): boolean {
  if (!nextRunAt) return true;
  const t = nextRunAt instanceof Date ? nextRunAt.getTime() : new Date(nextRunAt).getTime();
  if (Number.isNaN(t)) return true;
  return now.getTime() + DUE_TOLERANCE_MS >= t;
}

/** Automática atrasada? (mais de `graceMs` além do horário previsto) */
export function isScheduleLate(
  nextRunAt: string | Date | null | undefined,
  now: Date,
  graceMs = 10 * 60 * 1000,
): boolean {
  if (!nextRunAt) return false;
  const t = nextRunAt instanceof Date ? nextRunAt.getTime() : new Date(nextRunAt).getTime();
  if (Number.isNaN(t)) return false;
  return now.getTime() - t > graceMs;
}

// ---------- Diff ----------

/** Campos sincronizados que são auditados no histórico. */
export const AUDITED_FIELDS = [
  { key: "name", label: "Nome" },
  { key: "linkVitale", label: "Link Vitale" },
  { key: "price", label: "Preço R$" },
  { key: "autonomyKm", label: "Autonomia" },
  { key: "capacity", label: "Capacidade" },
  { key: "description", label: "Descrição" },
  { key: "image", label: "Imagem da Bike" },
] as const;

export type AuditedField = (typeof AUDITED_FIELDS)[number]["key"];

export type ChangeType = "new" | "updated" | "removed" | "inactivated" | "reactivated";

export interface BikeFieldChange {
  bike_id: string;
  bike_name: string | null;
  change_type: ChangeType;
  field: string | null;
  field_label: string | null;
  old_value: string | null;
  new_value: string | null;
}

export interface DiffableBike {
  id: string;
  name?: string;
  linkVitale?: string;
  price?: number;
  autonomyKm?: number;
  capacity?: number;
  description?: string;
  image?: string;
  status?: string;
}

/** Valor legível e seguro (sem segredos: só campos do catálogo entram aqui). */
function displayValue(value: unknown): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number") return String(value);
  return String(value).replace(/\s+/g, " ").trim().slice(0, 500);
}

function sameValue(a: unknown, b: unknown): boolean {
  return displayValue(a) === displayValue(b);
}

/**
 * Compara duas listas de bikes e devolve o diff campo a campo.
 * - bike ausente antes: "new"
 * - bike ausente depois: "removed"
 * - status virou/deixou de ser "inactive": "inactivated"/"reactivated"
 * - demais diferenças: uma linha "updated" por campo alterado
 */
export function diffBikes(
  previous: DiffableBike[],
  next: DiffableBike[],
): BikeFieldChange[] {
  const prevById = new Map(previous.map((b) => [b.id, b]));
  const nextById = new Map(next.map((b) => [b.id, b]));
  const changes: BikeFieldChange[] = [];

  for (const bike of next) {
    const before = prevById.get(bike.id);
    if (!before) {
      changes.push({
        bike_id: bike.id,
        bike_name: bike.name ?? null,
        change_type: "new",
        field: null,
        field_label: null,
        old_value: null,
        new_value: displayValue(bike.name),
      });
      continue;
    }

    if (before.status !== bike.status && (before.status === "inactive" || bike.status === "inactive")) {
      changes.push({
        bike_id: bike.id,
        bike_name: bike.name ?? null,
        change_type: bike.status === "inactive" ? "inactivated" : "reactivated",
        field: "status",
        field_label: "Ativa",
        old_value: displayValue(before.status),
        new_value: displayValue(bike.status),
      });
    }

    for (const { key, label } of AUDITED_FIELDS) {
      const oldV = (before as Record<string, unknown>)[key];
      const newV = (bike as Record<string, unknown>)[key];
      if (sameValue(oldV, newV)) continue;
      changes.push({
        bike_id: bike.id,
        bike_name: bike.name ?? null,
        change_type: "updated",
        field: key,
        field_label: label,
        old_value: displayValue(oldV),
        new_value: displayValue(newV),
      });
    }
  }

  for (const bike of previous) {
    if (nextById.has(bike.id)) continue;
    changes.push({
      bike_id: bike.id,
      bike_name: bike.name ?? null,
      change_type: "removed",
      field: null,
      field_label: null,
      old_value: displayValue(bike.name),
      new_value: null,
    });
  }

  return changes;
}

/** Quantidade de bikes distintas com alguma mudança. */
export function countChangedBikes(changes: BikeFieldChange[]): number {
  return new Set(changes.map((c) => c.bike_id)).size;
}
