/** Formatação e validação de entrada compartilhadas pelas calculadoras rápidas. */

export const brl = (value: number, cents = false) =>
  value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });

export const decimal = (value: number, digits = 1) =>
  value.toLocaleString("pt-BR", { maximumFractionDigits: digits });

/** Campo vazio vira NaN (nunca 0 implícito). Aceita vírgula decimal. */
export const parseNumber = (raw: string) => (raw.trim() === "" ? Number.NaN : Number(raw.replace(",", ".")));

export function validateNumber(raw: string, label: string, range: { min: number; max: number }) {
  if (raw.trim() === "") return `${label}: preencha este campo.`;
  const value = parseNumber(raw);
  if (!Number.isFinite(value) || value < 0) return `${label}: informe um número válido e não negativo.`;
  if (value < range.min || value > range.max) return `${label}: use um valor entre ${range.min} e ${range.max}.`;
  return null;
}

export type BudgetMode = "none" | "custom" | `${number}`;

/** "none" = sem limite explícito; "custom" usa o valor livre (validado à parte, nunca vira "sem limite"). */
export function resolveBudget(mode: BudgetMode, custom: string): number | null {
  if (mode === "none") return null;
  return mode === "custom" ? parseNumber(custom) : Number(mode);
}
