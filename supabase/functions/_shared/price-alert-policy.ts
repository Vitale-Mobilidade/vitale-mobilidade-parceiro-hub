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
