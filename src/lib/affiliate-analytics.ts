/**
 * Contrato único de analytics de clique afiliado (dataLayer/GTM).
 * SEM PII: nunca envia nome, e-mail, telefone, texto livre ou URL completa.
 * Disparo não bloqueante: nunca usa preventDefault, await ou rede síncrona.
 */

export const AFFILIATE_CLICK_EVENT = "affiliate_click";

/** Posições permitidas — enum fechado, sem texto livre. */
export type AffiliatePosition =
  | "bike_detail_hero"
  | "bike_detail_final"
  | "radar_detail"
  | "radar_highlight"
  | "radar_catalog";

export type AffiliateClickPayload = {
  bike_id: string;
  position: AffiliatePosition;
  /** Caminho da rota (sem query, sem hash). */
  route?: string;
  /** Destino do link — sempre o domínio, nunca a URL completa. */
  destination?: "mercado_livre";
};

const ALLOWED_KEYS = new Set(["bike_id", "position", "route", "destination"]);

function currentRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.location.pathname;
  } catch {
    return undefined;
  }
}

/**
 * Empurra o evento no dataLayer. Falha silenciosa: analytics nunca bloqueia
 * nem altera a navegação do link afiliado.
 */
export function trackAffiliateClick(payload: AffiliateClickPayload) {
  if (typeof window === "undefined") return;
  const merged: Record<string, unknown> = {
    destination: "mercado_livre",
    route: currentRoute(),
    ...payload,
  };
  const safe: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (!ALLOWED_KEYS.has(k)) continue;
    if (typeof v !== "string") continue;
    const trimmed = v.trim();
    if (!trimmed) continue;
    // Nunca enviar URL completa.
    if (/^https?:\/\//i.test(trimmed)) continue;
    safe[k] = trimmed;
  }
  if (!safe.bike_id || !safe.position) return;
  try {
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push({ event: AFFILIATE_CLICK_EVENT, ...safe });
  } catch {
    /* analytics nunca quebra a página */
  }
}
