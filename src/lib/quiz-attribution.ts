/**
 * Atribuição de campanha do quiz /escolherbike.
 *
 * Regras:
 * - Captura os UTMs REAIS da URL de entrada (nomes de parâmetro case-insensitive,
 *   valores preservados exatamente como vieram).
 * - Persistência por SESSÃO (sessionStorage). Nunca herda UTMs de outra sessão.
 * - Entrada nova COM UTMs substitui todo o conjunto da sessão.
 * - Entrada sem UTMs não inventa, não usa padrão e não reaproveita campanha antiga
 *   de outra sessão.
 * - source_url guarda a URL COMPLETA de entrada, com query string.
 */

export const QUIZ_ATTRIBUTION_KEY = "vitale_quiz_attribution_v2";

export const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export type UtmKey = (typeof UTM_KEYS)[number];

export type UtmSet = Record<UtmKey, string | null>;

export interface QuizAttribution extends UtmSet {
  /** URL completa de entrada, incluindo query string. */
  source_url: string | null;
  entry_at: string | null;
}

export const EMPTY_UTMS: UtmSet = {
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
};

/** Lê os UTMs de uma URL. Nomes case-insensitive, valores intactos. */
export function parseUtmsFromUrl(href: string): UtmSet {
  const out: UtmSet = { ...EMPTY_UTMS };
  let search = "";
  try {
    search = new URL(href, "https://placeholder.local").search;
  } catch {
    search = "";
  }
  const params = new URLSearchParams(search);
  for (const [rawKey, rawValue] of params.entries()) {
    const key = rawKey.trim().toLowerCase() as UtmKey;
    if ((UTM_KEYS as readonly string[]).includes(key)) {
      const value = rawValue;
      if (value !== null && value.trim() !== "" && out[key] === null) out[key] = value;
    }
  }
  return out;
}

export function hasAnyUtm(utms: UtmSet): boolean {
  return UTM_KEYS.some((k) => !!utms[k]);
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function safeParse(raw: string | null): QuizAttribution | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const out: QuizAttribution = {
      ...EMPTY_UTMS,
      source_url: typeof parsed.source_url === "string" ? parsed.source_url : null,
      entry_at: typeof parsed.entry_at === "string" ? parsed.entry_at : null,
    };
    for (const k of UTM_KEYS) out[k] = typeof parsed[k] === "string" && parsed[k] ? parsed[k] : null;
    return out;
  } catch {
    return null;
  }
}

/**
 * Resolve a atribuição da sessão a partir da URL de entrada.
 * Exportada pura (com storage injetável) para permitir testes.
 */
export function resolveQuizAttribution(
  href: string,
  storage: StorageLike | null,
  now: Date = new Date(),
): QuizAttribution {
  const urlUtms = parseUtmsFromUrl(href);
  const stored = storage ? safeParse(storage.getItem(QUIZ_ATTRIBUTION_KEY)) : null;

  let next: QuizAttribution;
  if (hasAnyUtm(urlUtms)) {
    // Nova entrada com campanha => substitui integralmente o conjunto da sessão.
    next = { ...urlUtms, source_url: href, entry_at: now.toISOString() };
  } else if (stored) {
    // Mesma sessão, navegação interna / query removida pelo React => preserva.
    next = { ...stored, source_url: stored.source_url ?? href };
  } else {
    // Sem UTMs e sem sessão anterior => nada de padrão, nada herdado.
    next = { ...EMPTY_UTMS, source_url: href, entry_at: now.toISOString() };
  }

  try {
    storage?.setItem(QUIZ_ATTRIBUTION_KEY, JSON.stringify(next));
  } catch {
    /* storage indisponível: segue apenas em memória */
  }
  return next;
}

/** Wrapper de browser: usa sessionStorage (escopo de sessão). */
export function captureQuizAttribution(): QuizAttribution {
  if (typeof window === "undefined") {
    return { ...EMPTY_UTMS, source_url: null, entry_at: null };
  }
  let storage: StorageLike | null = null;
  try {
    storage = window.sessionStorage;
  } catch {
    storage = null;
  }
  return resolveQuizAttribution(window.location.href, storage);
}

/**
 * traffic_origin só existe quando há utm_source real. Nunca há valor padrão.
 */
export function trafficOriginFromUtms(utms: UtmSet): string | null {
  return utms.utm_source ?? null;
}

/** Campos de atribuição enviados no payload. Chaves sem valor real ficam null. */
export function attributionPayload(attribution: QuizAttribution) {
  return {
    utm_source: attribution.utm_source,
    utm_medium: attribution.utm_medium,
    utm_campaign: attribution.utm_campaign,
    utm_content: attribution.utm_content,
    utm_term: attribution.utm_term,
    traffic_origin: trafficOriginFromUtms(attribution),
    source_url: attribution.source_url,
  };
}
