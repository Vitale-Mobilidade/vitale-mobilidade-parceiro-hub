// Server-only: leitura read-only da aba de bikes com cache em memória (stale em falha).
import { SHEET_CSV_URL } from "../../supabase/functions/_shared/bike-sheet";
import { buildBikeCatalog, type CatalogBike } from "./bike-catalog";

const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5000;
let cache: { at: number; items: CatalogBike[] } | null = null;

export async function fetchBikeCatalog(): Promise<CatalogBike[] | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(SHEET_CSV_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`bikes ${res.status}`);
    const items = buildBikeCatalog(await res.text());
    if (items.length) cache = { at: Date.now(), items };
    return items.length ? items : (cache?.items ?? null);
  } catch (e) {
    console.error("[bike-catalog] leitura falhou", e);
    return cache?.items ?? null;
  } finally {
    clearTimeout(timer);
  }
}
