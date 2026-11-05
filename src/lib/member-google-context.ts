import { memberReturnPath } from "./member-community";
import { referralCode } from "./newsletter-referrals";
const KEY = "vitale-google-return";
const TTL = 15 * 60 * 1000;
export function googleMemberContext(path: unknown, invitation: unknown) {
  return {
    returnTo: memberReturnPath(path),
    invitationCode: referralCode(invitation),
  };
}
/** Navigation only. No OAuth token, email, phone, password or consent is stored. */
export function rememberGoogleMemberContext(path: string, invitation?: string) {
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        ...googleMemberContext(path, invitation),
        expiresAt: Date.now() + TTL,
      }),
    );
  } catch {
    /* Callback safely falls back to Home. */
  }
}
export function readGoogleMemberContext() {
  const empty = googleMemberContext("/", undefined);
  try {
    const value = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (
      value &&
      typeof value.expiresAt === "number" &&
      value.expiresAt > Date.now() &&
      value.expiresAt <= Date.now() + TTL
    )
      return googleMemberContext(value.returnTo, value.invitationCode);
  } catch {
    /* Expired/tampered context is ignored. */
  }
  return empty;
}
export function clearGoogleMemberContext() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* Navigation continues. */
  }
}
export function googleMemberReturnHref(
  context: ReturnType<typeof googleMemberContext>,
) {
  const q = new URLSearchParams({ modo: "entrar", retorno: context.returnTo });
  if (context.invitationCode) q.set("convite", context.invitationCode);
  return `/conta?${q}`;
}
