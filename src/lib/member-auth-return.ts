import { memberReturnPath } from "./member-community";
const KEY = "vitale-member-recovery-return";
/** Navigation context only. Never store credentials or a recovery URL/token. */
export function rememberMemberReturn(path: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        path: memberReturnPath(path),
        expiresAt: Date.now() + 30 * 60 * 1000,
      }),
    );
  } catch {
    /* Storage cannot block recovery. */
  }
}
export function rememberedMemberReturn(fallback: string) {
  if (typeof window === "undefined") return memberReturnPath(fallback);
  try {
    const data = JSON.parse(window.localStorage.getItem(KEY) ?? "null");
    if (
      data &&
      typeof data.path === "string" &&
      typeof data.expiresAt === "number" &&
      data.expiresAt > Date.now() &&
      data.expiresAt <= Date.now() + 30 * 60 * 1000
    )
      return memberReturnPath(data.path);
  } catch {
    /* Treat tampered/expired context as absent. */
  }
  return memberReturnPath(fallback);
}
export function clearMemberReturn() {
  if (typeof window !== "undefined")
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* Navigation remains available. */
    }
}
