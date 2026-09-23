// Server-only: catálogo editorial lido do Supabase (public.bikes + oferta atual),
// via RPC pública read-only. Nunca usa service role nem lê tabelas diretamente.
// Substitui a leitura direta do CSV da planilha nas páginas /bikes e /bikes/$slug.
import { SLUG_RE, type CatalogBike } from "./editorial-bikes";

const TIMEOUT_MS = 6000;
const TTL_MS = 5 * 60 * 1000;
let cache: { at: number; items: CatalogBike[] } | null = null;

type RpcRow = {
  bikeId?: unknown;
  slug?: unknown;
  name?: unknown;
  category?: unknown;
  autonomy?: unknown;
  capacity?: unknown;
  description?: unknown;
  image?: unknown;
  price?: unknown;
  link?: unknown;
};

const text = (v: unknown): string | null => {
  const s = typeof v === "string" ? v.trim() : "";
  return s ? s : null;
};

/** URL afiliada só é aceita byte a byte no padrão oficial; qualquer outra coisa vira null. */
const MELI_RE = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/;

export function mapCatalogRow(row: RpcRow): CatalogBike | null {
  const bikeId = text(row.bikeId);
  const slug = text(row.slug);
  const name = text(row.name);
  if (!bikeId || !slug || !name || !SLUG_RE.test(slug)) return null;
  const rawLink = typeof row.link === "string" ? row.link : "";
  const link = MELI_RE.test(rawLink) ? rawLink : null;
  const priceNum = typeof row.price === "number" ? row.price : Number(row.price);
  // Preço e link vêm do MESMO registro de oferta atual: sem link válido, sem preço comercial.
  const price = link && Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null;
  return {
    bikeId,
    slug,
    name,
    link,
    sheetPrice: price,
    autonomy: text(row.autonomy),
    capacity: text(row.capacity),
    description: text(row.description),
    image: text(row.image),
    category: text(row.category),
  };
}

async function callRpc(): Promise<CatalogBike[] | null> {
  const url = process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/get_bikes_public_catalog`, {
      method: "POST",
      headers: { apikey: key, "Content-Type": "application/json", Accept: "application/json" },
      body: "{}",
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as unknown;
    if (!Array.isArray(data)) return null;
    return data
      .map((r) => mapCatalogRow(r as RpcRow))
      .filter((b): b is CatalogBike => b !== null)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  } catch (e) {
    console.error("[bikes-repository] leitura falhou", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Catálogo editorial com cache curto em memória; mantém o último bom em falha. */
export async function fetchBikeCatalogFromDb(): Promise<CatalogBike[] | null> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const items = await callRpc();
  if (items && items.length) {
    cache = { at: Date.now(), items };
    return items;
  }
  return cache?.items ?? null;
}
