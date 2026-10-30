// Server-only: leitura pública do Radar via RPCs somente leitura (chave publicável/anon).
// Nunca usa service role nem lê tabelas diretamente.

import { BIKE_ID_RE } from "@/lib/bike-identity";
import { resolveBikeRecordImage } from "./bike-catalog";
import { parseOfferClickRanks } from "../../supabase/functions/_shared/bike-relevance";

const TIMEOUT_MS = 6000;

export type RadarResult<T> = { ok: true; data: T } | { ok: false };

async function callRpc<T>(fn: string, args: Record<string, unknown>): Promise<RadarResult<T>> {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return { ok: false };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(args),
      signal: controller.signal,
    });
    if (!res.ok) return { ok: false };
    return { ok: true, data: (await res.json()) as T };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
}

/** Item com oferta atual válida: preço e link vêm da MESMA linha de bike_offers. */
function hasCurrentOffer(item: unknown): boolean {
  const x = item as { hasCurrentOffer?: unknown; currentPrice?: unknown; link?: unknown };
  return (
    x?.hasCurrentOffer === true &&
    typeof x.currentPrice === "number" &&
    Number.isFinite(x.currentPrice) &&
    x.currentPrice > 0 &&
    typeof x.link === "string" &&
    x.link !== ""
  );
}

/**
 * Uma única leitura da RPC, separada em:
 *  - active: bikes com oferta atual válida (preço + link da mesma linha);
 *  - archived: bikes sem oferta atual, mas com observações já registradas.
 * A elegibilidade do Quiz não é mais aplicada aqui (contrato da RPC).
 */
export async function fetchTrackerSplit(): Promise<RadarResult<{ active: unknown[]; archived: unknown[] }>> {
  const r = await callRpc<unknown>("get_price_tracker_catalog", {});
  if (!r.ok || !Array.isArray(r.data)) return { ok: false };
  const records = r.data.map(resolveBikeRecordImage);
  const active = records.filter(hasCurrentOffer);
  const archived = records.filter((item) => {
    const x = item as { observations?: unknown };
    return !hasCurrentOffer(item) && typeof x.observations === "number" && x.observations > 0;
  });
  return { ok: true, data: { active, archived } };
}

/** Catálogo ATIVO do Radar: só bikes com oferta atual válida. */
export async function fetchTrackerCatalog(): Promise<RadarResult<unknown[]>> {
  const r = await fetchTrackerSplit();
  return r.ok ? { ok: true, data: r.data.active } : { ok: false };
}

/** Ranking usado só onde há ordenação por relevância; sitemap/jobs não dependem de analytics. */
export async function fetchRankedTrackerSplit(): Promise<
  RadarResult<{ active: unknown[]; archived: unknown[]; relevanceAvailable: boolean }>
> {
  const [catalog, ranks] = await Promise.all([
    fetchTrackerSplit(),
    callRpc<unknown>("get_radar_offer_click_ranks_30d", {}),
  ]);
  if (!catalog.ok) return { ok: false };

  const parsed = ranks.ok ? parseOfferClickRanks(ranks.data) : null;
  const byId = parsed ?? new Map<string, number>();
  let relevanceAvailable = parsed !== null;
  // Never use a partial response: a missing rank could silently demote a bike.
  if (catalog.data.active.some((item) => !byId.has((item as { id: string }).id))) relevanceAvailable = false;
  return {
    ok: true,
    data: {
      archived: catalog.data.archived,
      relevanceAvailable,
      active: catalog.data.active.map((item) => ({
        ...(item as Record<string, unknown>),
        offerClickRank30d: relevanceAvailable ? byId.get((item as { id: string }).id) : null,
      })),
    },
  };
}

export async function fetchBikeHistory(bikeId: string): Promise<RadarResult<unknown | null>> {
  if (!BIKE_ID_RE.test(bikeId)) return { ok: true, data: null };
  // p_days 0 = série completa; a janela é aplicada no cliente (mesmo contrato da página).
  const r = await callRpc<unknown>("get_bike_price_history", { p_bike_id: bikeId, p_days: 0 });
  if (!r.ok) return { ok: false };
  return { ok: true, data: resolveBikeRecordImage(r.data ?? null) };
}
