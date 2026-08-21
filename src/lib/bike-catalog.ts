/**
 * Catálogo dinâmico do quiz.
 *
 * A planilha oficial é a fonte para os 6 campos atuais:
 *   Nome, Link Vitale, Preço, Autonomia, Capacidade e Descrição.
 * Colunas opcionais (ID, Imagem, Peso Suportado, Usos, Terrenos, Pontos Fortes,
 * Diferencial, Perfil Indicado, Ativa) permitem cadastrar bikes NOVAS.
 *
 * Bikes existentes mantêm id, imagem e metadados estáticos como fallback.
 * Bikes novas só entram no quiz quando têm os dados mínimos (status "eligible").
 *
 * Fallback em cascata: snapshot do banco -> catálogo estático.
 */

import { BIKES, type Bike, type BudgetTier } from "@/data/bikes";

export type SnapshotBikeStatus = "eligible" | "draft" | "inactive";

export interface SnapshotBike {
  id: string;
  name: string;
  linkVitale: string;
  price: number;
  autonomyKm: number;
  capacity: 1 | 2;
  description: string;
  shortDescription: string;
  isNew?: boolean;
  status?: SnapshotBikeStatus;
  missingFields?: string[];
  line?: number;
  image?: string;
  weightSupportKg?: number;
  bestFor?: string[];
  terrains?: string[];
  strengths?: string[];
  diferencial?: string;
  perfilIndicado?: string;
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

/** Linha do painel: bike + estado de correspondência. */
export interface CatalogRow {
  id: string;
  name: string;
  image: string | null;
  price: number | null;
  autonomyKm: number | null;
  capacity: 1 | 2 | null;
  linkVitale: string | null;
  state: "eligible" | "draft" | "inactive" | "static";
  isNew: boolean;
  missingFields: string[];
  fromSheet: boolean;
}

/** Faixa de orçamento correspondente ao preço. */
export function tierForPrice(price: number): BudgetTier {
  if (price <= 7000) return "ate_7000";
  if (price <= 8000) return "7000_8000";
  if (price <= 10000) return "8000_10000";
  return "acima_10000";
}

const MELI_RE = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/;

function isValidSnapshotBike(b: unknown): b is SnapshotBike {
  const x = b as SnapshotBike;
  return !!x && typeof x.id === "string" && x.id.length > 0
    && typeof x.linkVitale === "string" && MELI_RE.test(x.linkVitale)
    && typeof x.price === "number" && x.price > 0
    && typeof x.autonomyKm === "number" && x.autonomyKm > 0
    && (x.capacity === 1 || x.capacity === 2)
    && typeof x.description === "string" && x.description.trim().length > 0;
}

/** Índice id -> linha válida do snapshot (primeira ocorrência vence). */
function indexSnapshot(snapshotBikes: unknown): Map<string, SnapshotBike> {
  const list = Array.isArray(snapshotBikes) ? snapshotBikes : [];
  const byId = new Map<string, SnapshotBike>();
  for (const raw of list) {
    if (!isValidSnapshotBike(raw)) continue;
    if (byId.has(raw.id)) continue;
    byId.set(raw.id, raw);
  }
  return byId;
}

function statusOf(s: SnapshotBike): SnapshotBikeStatus {
  return s.status ?? "eligible";
}

/** Bike nova construída somente com dados da planilha (sem inventar metadados). */
function bikeFromSnapshot(s: SnapshotBike): Bike | null {
  if (!s.image || !s.weightSupportKg || !s.bestFor?.length || !s.terrains?.length) return null;
  return {
    id: s.id,
    name: s.name,
    shortDescription: s.shortDescription || s.description.slice(0, 200),
    fullDescription: s.description,
    image: s.image,
    affiliateLink: s.linkVitale,
    linkVitale: s.linkVitale,
    // Sem link Meta específico: usa o link da planilha, nunca sobrescreve estático.
    linkMeta: s.linkVitale,
    internalPrice: s.price,
    capacity: s.capacity,
    weightSupportKg: s.weightSupportKg,
    autonomyKm: s.autonomyKm,
    bestFor: s.bestFor,
    terrains: s.terrains,
    strengths: s.strengths ?? [],
    budgetTiers: [tierForPrice(s.price)],
    diferencial: s.diferencial ?? "",
    perfilIndicado: s.perfilIndicado ?? "",
    isDynamic: true,
  };
}

/**
 * Aplica o snapshot sobre o catálogo estático.
 * - Bikes existentes recebem override apenas dos campos presentes na planilha.
 * - Bikes novas entram somente quando "eligible" e com metadados mínimos.
 * - Linhas inválidas/duplicadas/inativas nunca entram no quiz.
 */
export function mergeCatalog(base: Bike[], snapshotBikes: unknown): Bike[] {
  const byId = indexSnapshot(snapshotBikes);
  const baseIds = new Set(base.map((b) => b.id));

  const merged = base.map((bike) => {
    const s = byId.get(bike.id);
    if (!s || statusOf(s) === "inactive") return bike;
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
      // Overrides opcionais só quando presentes na planilha
      image: s.image || bike.image,
      weightSupportKg: s.weightSupportKg ?? bike.weightSupportKg,
      bestFor: s.bestFor?.length ? s.bestFor : bike.bestFor,
      terrains: s.terrains?.length ? s.terrains : bike.terrains,
      strengths: s.strengths?.length ? s.strengths : bike.strengths,
      diferencial: s.diferencial || bike.diferencial,
      perfilIndicado: s.perfilIndicado || bike.perfilIndicado,
    };
  });

  // Bikes novas elegíveis
  for (const s of byId.values()) {
    if (baseIds.has(s.id)) continue;
    if (statusOf(s) !== "eligible") continue;
    const created = bikeFromSnapshot(s);
    if (created) merged.push(created);
  }

  return merged;
}

/** Linhas para o painel: todas as bikes do catálogo + drafts/inativas da planilha. */
export function buildCatalogRows(base: Bike[], snapshotBikes: unknown): CatalogRow[] {
  const byId = indexSnapshot(snapshotBikes);
  const baseIds = new Set(base.map((b) => b.id));
  const merged = mergeCatalog(base, snapshotBikes);

  const rows: CatalogRow[] = merged.map((bike) => {
    const s = byId.get(bike.id);
    return {
      id: bike.id,
      name: bike.name,
      image: bike.image ?? null,
      price: bike.internalPrice,
      autonomyKm: bike.autonomyKm,
      capacity: bike.capacity,
      linkVitale: bike.linkVitale,
      state: s ? (statusOf(s) === "inactive" ? "inactive" : "eligible") : "static",
      isNew: !baseIds.has(bike.id),
      missingFields: s?.missingFields ?? [],
      fromSheet: !!s,
    };
  });

  // Drafts / inativas que não entraram no quiz
  for (const s of byId.values()) {
    if (rows.some((r) => r.id === s.id)) continue;
    rows.push({
      id: s.id,
      name: s.name,
      image: s.image ?? null,
      price: s.price,
      autonomyKm: s.autonomyKm,
      capacity: s.capacity,
      linkVitale: s.linkVitale,
      state: statusOf(s) === "inactive" ? "inactive" : "draft",
      isNew: !baseIds.has(s.id),
      missingFields: s.missingFields ?? [],
      fromSheet: true,
    });
  }

  return rows;
}

/** Catálogo estático (fallback final). */
export const STATIC_CATALOG: Bike[] = BIKES;
