export const ASSISTANT_INVITE_KEY = "vitale:assistant-invite-until:v1";
export const ASSISTANT_INVITE_MS = 10_000;
export const ASSISTANT_INVITE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
let memoryUntil = 0;
type Store = Pick<Storage, "getItem" | "setItem">;

export function assistantInviteAllowed(
  storage: Store | null,
  now = Date.now(),
) {
  let until = memoryUntil;
  try {
    const raw = storage?.getItem(ASSISTANT_INVITE_KEY);
    const saved = raw ? Number(raw) : 0;
    if (
      Number.isFinite(saved) &&
      saved > 0 &&
      saved <= now + ASSISTANT_INVITE_COOLDOWN_MS
    )
      until = Math.max(until, saved);
  } catch {
    /* Keep the in-memory fallback for this tab. */
  }
  return now >= until;
}

export function dismissAssistantInvite(
  storage: Store | null,
  now = Date.now(),
) {
  memoryUntil = now + ASSISTANT_INVITE_COOLDOWN_MS;
  try {
    storage?.setItem(ASSISTANT_INVITE_KEY, String(memoryUntil));
  } catch {
    /* This tab still suppresses the invitation. */
  }
}
