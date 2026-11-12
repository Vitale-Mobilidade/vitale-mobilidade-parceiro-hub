export const NEWSLETTER_DISMISS_KEY = "vitale-newsletter-dismissed";
export const NEWSLETTER_SUBSCRIBED_KEY = "vitale-newsletter-subscribed";
export const NEWSLETTER_COOLDOWN = 3 * 24 * 60 * 60 * 1000;
export function newsletterPopupAllowed(
  path: string,
  dismissed: string | null,
  subscribed: string | null,
  now = Date.now(),
) {
  if (/^\/(quiz|admin|api)(\/|$)/.test(path) || subscribed === "1")
    return false;
  const time = Number(dismissed);
  return (
    !dismissed ||
    !Number.isFinite(time) ||
    (time <= now && now - time >= NEWSLETTER_COOLDOWN)
  );
}
