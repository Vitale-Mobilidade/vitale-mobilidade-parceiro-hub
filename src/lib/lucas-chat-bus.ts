// Simple pub/sub used to coordinate promotional popups on /escolherbike with
// the SDR "Lucas" chat. When the chat is open (or was recently closed) other
// promotional overlays MUST stay silent.

const EVENT = "lucas-chat-changed";
const OPEN_KEY = "__lucasChatOpen";
const CLOSED_AT_KEY = "__lucasChatClosedAt";

type W = typeof window & {
  [OPEN_KEY]?: boolean;
  [CLOSED_AT_KEY]?: number;
};

export function setChatOpen(open: boolean) {
  if (typeof window === "undefined") return;
  const w = window as W;
  w[OPEN_KEY] = open;
  if (!open) w[CLOSED_AT_KEY] = Date.now();
  try { window.dispatchEvent(new CustomEvent(EVENT, { detail: { open } })); } catch {}
}

export function isChatOpen(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as W)[OPEN_KEY];
}

/** True se o chat está aberto ou fechou há menos de `graceMs`. */
export function isChatCoolingDown(graceMs = 15000): boolean {
  if (typeof window === "undefined") return false;
  const w = window as W;
  if (w[OPEN_KEY]) return true;
  const closedAt = w[CLOSED_AT_KEY] ?? 0;
  return closedAt > 0 && Date.now() - closedAt < graceMs;
}

export function onChatChanged(cb: (open: boolean) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const detail = (e as CustomEvent<{ open: boolean }>).detail;
    cb(!!detail?.open);
  };
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
