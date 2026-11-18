/** Floor is 70% of the current authoritative price, rounded up to cents. */
export function minimumAlertPrice(currentPrice: number): number {
  if (!Number.isFinite(currentPrice) || currentPrice <= 0) return NaN;
  const currentCents = Math.round(currentPrice * 100);
  return Math.ceil(currentCents * 70 / 100) / 100;
}
export function minimumAlertMessage(currentPrice: number): string {
  const formatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(minimumAlertPrice(currentPrice));
  return `O valor mínimo para esta bike é ${formatted}.`;
}

/** Match the receiver contract before saving a request that cannot be exported. */
export function normalizeAlertName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().replace(/\s+/g, " ");
  return value.length >= 2 && value.length <= 80 && /\p{L}/u.test(value) ? value : null;
}
