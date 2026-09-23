/**
 * Contrato único de analytics de clique afiliado (dataLayer/GTM).
 * SEM PII: nunca envia nome, e-mail, telefone, texto livre ou URL completa.
 * Disparo não bloqueante: nunca usa preventDefault, await ou rede síncrona.
 *
 * Entrada pública aceita APENAS bike_id e position:
 * - route vem exclusivamente de window.location.pathname (sem query/hash),
 *   restrito às rotas que emitem o evento (/bikes/{slug}, /radar, /radar/{bikeId});
 * - destination é constante "mercado_livre";
 * - bike_id validado com a regex canônica do projeto (BIKE_ID_RE);
 * - position validado com allowlist em runtime.
 * Tipos TypeScript não são validação em runtime — tudo é revalidado aqui.
 */

import { BIKE_ID_RE } from "./bike-identity";

export const AFFILIATE_CLICK_EVENT = "affiliate_click";

/** Posições permitidas — enum fechado, sem texto livre. */
export const AFFILIATE_POSITIONS = [
  "bike_detail_hero",
  "bike_detail_final",
  "radar_detail",
  "radar_highlight",
  "radar_catalog",
  "calculadora_economia",
  "calculadora_payback",
] as const;

export type AffiliatePosition = (typeof AFFILIATE_POSITIONS)[number];

/** Entrada pública: somente bike_id e position. Nenhum outro campo é aceito. */
export type AffiliateClickInput = {
  bike_id: string;
  position: AffiliatePosition;
};

const POSITIONS = new Set<string>(AFFILIATE_POSITIONS);

/** Rotas que podem emitir o evento: /bikes/{slug}, /radar, /radar/{bikeId}, /calculadoras/economia, /calculadoras/payback. */
const ALLOWED_ROUTE_RE = /^\/bikes\/[a-z0-9-]+$|^\/radar(\/[a-z0-9_]+)?$|^\/calculadoras\/(economia|payback)$/;

function currentRoute(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const path = window.location.pathname; // nunca inclui query/hash
    return ALLOWED_ROUTE_RE.test(path) ? path : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Empurra o evento no dataLayer. Falha silenciosa: analytics nunca bloqueia
 * nem altera a navegação do link afiliado. Qualquer dado fora do contrato
 * (ou com valor inválido) impede a emissão.
 */
export function trackAffiliateClick(input: AffiliateClickInput) {
  if (typeof window === "undefined") return;
  try {
    const bikeId = typeof input?.bike_id === "string" ? input.bike_id.trim() : "";
    // Position: correspondência exata com a allowlist (sem trim/normalização).
    const position = typeof input?.position === "string" ? input.position : "";
    if (!BIKE_ID_RE.test(bikeId)) return;
    if (!POSITIONS.has(position)) return;
    const safe: Record<string, unknown> = {
      event: AFFILIATE_CLICK_EVENT,
      destination: "mercado_livre",
      bike_id: bikeId,
      position,
    };
    const route = currentRoute();
    if (route) safe.route = route;
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(safe);
  } catch {
    /* analytics nunca quebra a página */
  }
}
