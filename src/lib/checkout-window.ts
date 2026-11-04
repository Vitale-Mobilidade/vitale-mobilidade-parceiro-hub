export const CHECKOUT_WINDOW_MINUTES = 10;
export const CHECKOUT_WINDOW_MS = CHECKOUT_WINDOW_MINUTES * 60000;
export function checkoutSecondsRemaining(
  deadline: string | null | undefined,
  now: number,
): number | null {
  if (!deadline || !Number.isFinite(Date.parse(deadline))) return null;
  return Math.max(0, Math.ceil((Date.parse(deadline) - now) / 1000));
}
export function checkoutClock(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  return `${Math.floor(value / 60)
    .toString()
    .padStart(2, "0")}:${(value % 60).toString().padStart(2, "0")}`;
}
