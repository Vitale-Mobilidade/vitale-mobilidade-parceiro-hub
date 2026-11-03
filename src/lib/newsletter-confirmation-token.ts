// Browser memory only. Replacing the fragment can remount the route during
// hydration; keep the pending bearer for that remount, never in storage/history.
let pending: { token: string; expiresAt: number } | null = null;
export function takeNewsletterConfirmationToken(): string | null {
  if (typeof window === "undefined") return null;
  const hash = window.location.hash;
  const candidate = new URLSearchParams(hash.slice(1)).get("token");
  if (candidate && /^[a-f0-9]{64}$/.test(candidate))
    pending = { token: candidate, expiresAt: Date.now() + 5 * 60_000 };
  else if (hash) pending = null;
  if (hash)
    window.history.replaceState(
      window.history.state,
      "",
      window.location.pathname,
    );
  if (pending && pending.expiresAt <= Date.now()) pending = null;
  return pending?.token ?? null;
}
export function forgetNewsletterConfirmationToken() {
  pending = null;
}
