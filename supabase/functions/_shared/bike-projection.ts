/**
 * Etapa 7 — projeção do snapshot validado em public.bikes.
 * Somente identidade + specs estruturadas presentes/validadas.
 * NUNCA inclui preço, link, elegibilidade, oferta ou PII.
 * Falha aqui é isolada: não interrompe snapshot, Radar, Quiz, histórico ou jobs.
 */
import type { SnapshotBike } from "./bike-sheet.ts";

export interface BikeProjectionRow {
  bike_id: string;
  name: string;
  autonomy_km: number | null;
  capacity_people: 1 | 2 | null;
  /** Editorial opcional, somente do snapshot. Null nunca sobrescreve valor existente. */
  image_url: string | null;
  description: string | null;
  short_description: string | null;
}

export interface BikeProjectionResult {
  ok: boolean;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  conflicts?: Array<{ bike_id: string | null; reason: string; slug?: string }>;
  error?: string;
}

export function buildBikeProjectionRows(bikes: SnapshotBike[]): BikeProjectionRow[] {
  const seen = new Set<string>();
  const rows: BikeProjectionRow[] = [];
  for (const b of bikes) {
    if (!b?.id || seen.has(b.id)) continue;
    seen.add(b.id);
    const aut = typeof b.autonomyKm === "number" && Number.isFinite(b.autonomyKm) && b.autonomyKm > 0
      ? b.autonomyKm
      : null;
    const cap = b.capacity === 1 || b.capacity === 2 ? b.capacity : null;
    const rawImg = typeof b.image === "string" ? b.image.trim() : "";
    const img = /^https:\/\/[^\s"'<>]+$/.test(rawImg) ? rawImg : null;
    const desc = typeof b.description === "string" && b.description.trim() ? b.description.trim() : null;
    const short = typeof b.shortDescription === "string" && b.shortDescription.trim() ? b.shortDescription.trim() : null;
    rows.push({
      bike_id: b.id,
      name: String(b.name ?? "").trim(),
      autonomy_km: aut,
      capacity_people: cap,
      image_url: img,
      description: desc,
      short_description: short,
    });
  }
  return rows;
}

// deno-lint-ignore no-explicit-any
type RpcClient = { rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

export async function projectBikes(supabase: RpcClient, bikes: SnapshotBike[]): Promise<BikeProjectionResult> {
  try {
    const rows = buildBikeProjectionRows(bikes);
    const { data, error } = await supabase.rpc("project_bikes_from_snapshot", { p_rows: rows });
    if (error) return { ok: false, error: String(error.message ?? error).slice(0, 300) };
    const conflicts = Array.isArray(data?.conflicts) ? data.conflicts : [];
    if (conflicts.length) console.warn("[sync] bikes projection conflicts:", JSON.stringify(conflicts));
    return { ok: true, inserted: data?.inserted, updated: data?.updated, unchanged: data?.unchanged, conflicts };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}

// ---------------- Etapa 8 — ofertas (shadow; leitores comerciais não trocados) ----------------

export interface BikeOfferRow {
  bike_id: string;
  /** URL exata do snapshot — nunca normalizada/reescrita. */
  url: string | null;
  price: number | null;
  sheet_status: string | null;
  sheet_eligible: boolean | null;
}

export interface BikeOfferProjectionResult {
  ok: boolean;
  inserted?: number;
  updated?: number;
  unchanged?: number;
  ended?: number;
  skipped?: Array<{ bike_id: string | null; reason: string }>;
  error?: string;
}

/** Linha pendente da planilha (fonte da verdade comercial do run atual). */
export interface PendingOfferRow {
  id: string | null;
  missingFields?: string[];
}

/**
 * IDs cuja linha atual da planilha está sem "Link Vitale" e/ou "Preço R$".
 * A bike segue preservada em public.bikes (draft), mas a oferta comercial
 * NÃO pode continuar ativa com link/preço antigos.
 */
export function commerciallyPendingIds(pending: PendingOfferRow[] = []): Set<string> {
  const ids = new Set<string>();
  for (const p of pending) {
    if (!p?.id) continue;
    const missing = Array.isArray(p.missingFields) ? p.missingFields : [];
    if (missing.includes("Link Vitale") || missing.includes("Preço R$")) ids.add(p.id);
  }
  return ids;
}

export function buildBikeOfferRows(bikes: SnapshotBike[], pending: PendingOfferRow[] = []): BikeOfferRow[] {
  const seen = new Set<string>();
  const rows: BikeOfferRow[] = [];
  const pendingIds = commerciallyPendingIds(pending);
  for (const b of bikes) {
    if (!b?.id || seen.has(b.id)) continue;
    seen.add(b.id);
    const commercialBlocked = pendingIds.has(b.id);
    rows.push({
      bike_id: b.id,
      url: !commercialBlocked && typeof b.linkVitale === "string" ? b.linkVitale : null,
      price: !commercialBlocked && typeof b.price === "number" && Number.isFinite(b.price) ? b.price : null,
      sheet_status: typeof b.status === "string" ? b.status : null,
      sheet_eligible: typeof b.sheetEligible === "boolean" ? b.sheetEligible : null,
    });
  }
  return rows;
}

export async function projectBikeOffers(
  supabase: RpcClient,
  bikes: SnapshotBike[],
  pending: PendingOfferRow[] = [],
): Promise<BikeOfferProjectionResult> {
  try {
    const { data, error } = await supabase.rpc("project_bike_offers_from_snapshot", { p_rows: buildBikeOfferRows(bikes, pending) });
    if (error) return { ok: false, error: String(error.message ?? error).slice(0, 300) };
    const skipped = Array.isArray(data?.skipped) ? data.skipped : [];
    if (skipped.length) console.warn("[sync] offers projection skipped:", JSON.stringify(skipped));
    return { ok: true, inserted: data?.inserted, updated: data?.updated, unchanged: data?.unchanged, ended: data?.ended, skipped };
  } catch (e) {
    return { ok: false, error: String((e as Error)?.message ?? e).slice(0, 300) };
  }
}
