import { BIKE_ID_RE } from "./bike-identity";

/**
 * Comparação de bikes é um ESTADO de /radar (não uma rota): `?compare=bikeIdA,bikeIdB`.
 * Usa o bikeId canônico (chave estável). Máximo de 2 modelos nesta versão.
 * A URL canônica continua /radar; combinações nunca entram no sitemap.
 */
export const COMPARE_MAX = 2;

export function parseCompare(raw: unknown): string[] {
  if (typeof raw !== "string") return [];
  const ids = raw.split(",").map((s) => s.trim().toLowerCase()).filter((s) => BIKE_ID_RE.test(s));
  return [...new Set(ids)].slice(0, COMPARE_MAX);
}

export function compareParam(ids: (string | null | undefined)[]): string | undefined {
  const v = parseCompare(ids.filter(Boolean).join(","));
  return v.length ? v.join(",") : undefined;
}

export function radarCompareHref(ids: (string | null | undefined)[]): string {
  const compare = compareParam(ids);
  return compare ? `/radar?compare=${encodeURIComponent(compare)}` : "/radar";
}

export type CompareEvent = "bike_compare_added" | "bike_compare_removed" | "bike_comparison_opened" | "comparison_bike_clicked";

/** dataLayer sem PII; falha silenciosa e nunca bloqueia navegação. */
export function trackCompare(event: CompareEvent, data: { bike_id?: string; bike_ids?: string[]; target?: string }) {
  if (typeof window === "undefined") return;
  try {
    const safe: Record<string, unknown> = { event };
    if (data.bike_id && BIKE_ID_RE.test(data.bike_id)) safe.bike_id = data.bike_id;
    if (data.bike_ids) safe.bike_ids = data.bike_ids.filter((id) => BIKE_ID_RE.test(id)).join(",");
    if (data.target && /^(detail|radar|mercado_livre)$/.test(data.target)) safe.target = data.target;
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] };
    w.dataLayer = w.dataLayer || [];
    w.dataLayer.push(safe);
  } catch {
    /* analytics nunca quebra a página */
  }
}
