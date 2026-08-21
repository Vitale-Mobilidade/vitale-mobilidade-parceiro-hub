/**
 * Catálogo dinâmico do quiz.
 *
 * A planilha oficial é a fonte apenas para 6 campos:
 *   Nome, Link Vitale, Preço, Autonomia, Capacidade e Descrição.
 * Todo o resto (id, imagem, metadados de recomendação) permanece estático.
 *
 * Fallback em cascata: snapshot do banco -> catálogo estático.
 */

import { BIKES, type Bike, type BudgetTier } from "@/data/bikes";

export interface SnapshotBike {
  id: string;
  name: string;
  linkVitale: string;
  price: number;
  autonomyKm: number;
  capacity: 1 | 2;
  description: string;
  shortDescription: string;
}

export interface IgnoredRow {
  line: number;
  name: string;
  reason: string;
}

export interface CatalogSnapshot {
  generated_at?: string;
  bikes?: SnapshotBike[];
  ignored?: IgnoredRow[];
}

export interface SyncState {
  status: string;
  last_attempt_at: string | null;
  last_success_at: string | null;
  next_run_at: string | null;
  recognized_count: number;
  ignored_count: number;
  ignored_rows: IgnoredRow[];
  error_message: string | null;
}

/** Faixa de orçamento correspondente ao preço. */
export function tierForPrice(price: number): BudgetTier {
  if (price <= 7000) return "ate_7000";
  if (price <= 8000) return "7000_8000";
  if (price <= 10000) return "8000_10000";
  return "acima_10000";
}

function isValidSnapshotBike(b: unknown): b is SnapshotBike {
  const x = b as SnapshotBike;
  return !!x && typeof x.id === "string"
    && typeof x.linkVitale === "string" && /^https:\/\/meli\.la\/[A-Za-z0-9]+$/.test(x.linkVitale)
    && typeof x.price === "number" && x.price > 0
    && typeof x.autonomyKm === "number" && x.autonomyKm > 0
    && (x.capacity === 1 || x.capacity === 2)
    && typeof x.description === "string" && x.description.trim().length > 0;
}

/**
 * Aplica o snapshot sobre o catálogo estático.
 * - Linhas desconhecidas/ inválidas são ignoradas (nunca entram no quiz).
 * - Bikes sem linha na planilha continuam com os valores estáticos.
 */
export function mergeCatalog(base: Bike[], snapshotBikes: unknown): Bike[] {
  const list = Array.isArray(snapshotBikes) ? snapshotBikes : [];
  const byId = new Map<string, SnapshotBike>();
  for (const raw of list) {
    if (!isValidSnapshotBike(raw)) continue;
    if (!base.some((b) => b.id === raw.id)) continue; // nunca cria bike nova
    if (byId.has(raw.id)) continue; // duplicada: mantém a primeira
    byId.set(raw.id, raw);
  }

  return base.map((bike) => {
    const s = byId.get(bike.id);
    if (!s) return bike;
    const tier = tierForPrice(s.price);
    const budgetTiers = bike.budgetTiers.includes(tier) ? bike.budgetTiers : [tier];
    return {
      ...bike,
      name: s.name?.trim() || bike.name,
      shortDescription: s.shortDescription?.trim() || bike.shortDescription,
      fullDescription: s.description,
      internalPrice: s.price,
      autonomyKm: s.autonomyKm,
      capacity: s.capacity,
      linkVitale: s.linkVitale,
      affiliateLink: s.linkVitale,
      // linkMeta NUNCA é sobrescrito pela planilha
      linkMeta: bike.linkMeta,
      budgetTiers,
    };
  });
}

/** Catálogo estático (fallback final). */
export const STATIC_CATALOG: Bike[] = BIKES;
