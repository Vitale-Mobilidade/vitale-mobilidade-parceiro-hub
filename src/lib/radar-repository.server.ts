// Server-only: leitura pública do Radar via RPCs somente leitura (chave publicável/anon).
// Nunca usa service role nem lê tabelas diretamente.

import { BIKE_ID_RE } from "@/lib/bike-identity";

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

export async function fetchTrackerCatalog(): Promise<RadarResult<unknown[]>> {
  const r = await callRpc<unknown>("get_price_tracker_catalog", {});
  if (!r.ok || !Array.isArray(r.data)) return { ok: false };
  return { ok: true, data: r.data };
}

export async function fetchBikeHistory(bikeId: string): Promise<RadarResult<unknown | null>> {
  if (!BIKE_ID_RE.test(bikeId)) return { ok: true, data: null };
  // p_days 0 = série completa; a janela é aplicada no cliente (mesmo contrato da página).
  const r = await callRpc<unknown>("get_bike_price_history", { p_bike_id: bikeId, p_days: 0 });
  if (!r.ok) return { ok: false };
  return { ok: true, data: r.data ?? null };
}
