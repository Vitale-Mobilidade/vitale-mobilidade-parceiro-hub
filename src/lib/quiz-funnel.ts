/**
 * Funil anônimo do Quiz (/escolherbike). Nunca carrega nome, telefone, respostas
 * nem leadId: apenas um session_id aleatório por aba e o estágio alcançado.
 * Falhas são engolidas — analytics jamais bloqueia ou atrasa o Quiz.
 */
export const FUNNEL_EVENTS = ["page_view", "quiz_started", "question_answered", "lead_form_reached", "quiz_completed"] as const;
export type FunnelEvent = (typeof FUNNEL_EVENTS)[number];
export const FUNNEL_SESSION_KEY = "vitale_quiz_funnel_session";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FunnelContext = {
  path?: string | null; referrer?: string | null; device?: string | null;
  utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null; utm_term?: string | null;
};
export type FunnelPayload = {
  session_id: string; event: FunnelEvent; step: number | null;
  path: string | null; referrer: string | null; device: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null;
};

const clip = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

/** Somente pathname (sem query/hash) e hostname do referrer: nada que possa carregar PII de URL. */
export function safePath(v: unknown): string | null {
  const s = clip(v, 300); if (!s) return null;
  const p = s.split(/[?#]/)[0]; return p.startsWith("/") ? p : null;
}
export function safeReferrer(v: unknown): string | null {
  const s = clip(v, 500); if (!s) return null;
  try { return new URL(s).hostname.toLowerCase().slice(0, 120) || null; } catch { return null; }
}

export function normalizeFunnelEvent(sessionId: string, event: string, step?: number | null, ctx: FunnelContext = {}): FunnelPayload | null {
  if (!UUID_RE.test(sessionId)) return null;
  if (!(FUNNEL_EVENTS as readonly string[]).includes(event)) return null;
  let s: number | null = null;
  if (event === "question_answered") {
    if (!Number.isInteger(step) || (step as number) < 1 || (step as number) > 7) return null;
    s = step as number;
  }
  return {
    session_id: sessionId.toLowerCase(), event: event as FunnelEvent, step: s,
    path: safePath(ctx.path), referrer: safeReferrer(ctx.referrer), device: clip(ctx.device, 20),
    utm_source: clip(ctx.utm_source, 120), utm_medium: clip(ctx.utm_medium, 120), utm_campaign: clip(ctx.utm_campaign, 160),
    utm_content: clip(ctx.utm_content, 160), utm_term: clip(ctx.utm_term, 160),
  };
}

function randomUuid(): string {
  const c = globalThis.crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16); c.getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map(x => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function getFunnelSessionId(storage: Pick<Storage, "getItem" | "setItem"> | null = safeSession()): string {
  try {
    const existing = storage?.getItem(FUNNEL_SESSION_KEY);
    if (existing && UUID_RE.test(existing)) return existing;
    const id = randomUuid(); storage?.setItem(FUNNEL_SESSION_KEY, id); return id;
  } catch { return randomUuid(); }
}
function safeSession(): Storage | null { try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; } }

type Sender = (payload: FunnelPayload) => Promise<unknown>;
const defaultSender: Sender = (payload) => {
  const base = import.meta.env.VITE_SUPABASE_URL; const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!base || !key) return Promise.resolve();
  return fetch(`${base}/functions/v1/quiz-track`, {
    method: "POST", keepalive: true,
    headers: { "Content-Type": "application/json", apikey: key, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ action: "track_funnel", funnel: payload }),
  });
};

/** Fire-and-forget: retorna imediatamente; nunca lança. */
export function trackQuizFunnel(event: FunnelEvent, step: number | null = null, ctx: FunnelContext = {}, send: Sender = defaultSender): FunnelPayload | null {
  try {
    if (typeof window === "undefined") return null;
    const payload = normalizeFunnelEvent(getFunnelSessionId(), event, step, ctx);
    if (!payload) return null;
    try {
      const w = window as unknown as { dataLayer?: unknown[] };
      w.dataLayer = w.dataLayer || [];
      w.dataLayer.push({ event: `quiz_funnel_${event}`, funnel_event: event, funnel_session_id: payload.session_id, funnel_step: payload.step });
    } catch { /* ignore */ }
    try { void send(payload).catch(() => {}); } catch { /* ignore */ }
    return payload;
  } catch { return null; }
}
