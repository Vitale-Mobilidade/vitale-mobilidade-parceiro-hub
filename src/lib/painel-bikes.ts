/**
 * Suporte ao painel administrativo /painel-bikes.
 *
 * - Enriquecimento das linhas do catálogo com override de elegibilidade e
 *   status de imagem/perfil (vindos do bike-panel get-data).
 * - Ordenação natural pt-BR (case/acentos-insensível, numérica) com valores
 *   semânticos e nulos sempre por último.
 * - Sessão do painel: token opaco em sessionStorage (sem "lembrar") ou
 *   localStorage (com "lembrar"). Nunca armazena senha.
 */

import type { CatalogRow } from "@/lib/bike-catalog";

// ---------- Tipos de dados vindos do get-data ----------

export interface OverrideRow {
  bike_id: string;
  eligible: boolean;
  updated_by?: string | null;
  updated_at?: string | null;
}

export interface AssetRow {
  bike_id: string;
  status: string;
  needs_review?: boolean | null;
  error_message?: string | null;
  public_url?: string | null;
  updated_at?: string | null;
}

export interface ProfileRow {
  bike_id: string;
  status: string;
  error_message?: string | null;
  updated_at?: string | null;
}

/** Linha enriquecida exibida no painel. */
export interface PanelRow extends CatalogRow {
  /** Elegibilidade administrativa efetiva (override). */
  eligible: boolean;
  hasOverride: boolean;
  /** Data de atualização semântica para ordenação/exibição. */
  updatedAt: string | null;
  imageStatus: string | null;
  imageNeedsReview: boolean;
  profileStatus: string | null;
}

// ---------- Elegibilidade ----------

/**
 * Regra do override administrativo:
 * - Override presente: vale o valor persistido (sobrevive a syncs).
 * - Sem override: bike estática (sem linha na planilha) permanece elegível;
 *   bikes da planilha sem override NÃO são elegíveis (novas nascem false).
 */
export function effectiveEligible(
  state: CatalogRow["state"],
  override: { eligible: boolean } | undefined,
): boolean {
  if (override) return override.eligible;
  return state === "static";
}

// ---------- Enriquecimento ----------

export function buildPanelRows(
  rows: CatalogRow[],
  overrides: OverrideRow[],
  snapshotUpdatedAt: string | null,
  assets: AssetRow[] = [],
  profiles: ProfileRow[] = [],
): PanelRow[] {
  const overrideById = new Map(overrides.map((o) => [o.bike_id, o]));
  const assetById = new Map(assets.map((a) => [a.bike_id, a]));
  const profileById = new Map(profiles.map((p) => [p.bike_id, p]));

  return rows.map((r) => {
    const o = overrideById.get(r.id);
    const a = assetById.get(r.id);
    const p = profileById.get(r.id);
    return {
      ...r,
      eligible: effectiveEligible(r.state, o),
      hasOverride: !!o,
      updatedAt: r.fromSheet ? snapshotUpdatedAt : null,
      imageStatus: a?.status ?? null,
      imageNeedsReview: a?.needs_review === true,
      profileStatus: p?.status ?? null,
    };
  });
}

// ---------- Ordenação ----------

export type SortKey =
  | "name"
  | "price"
  | "autonomyKm"
  | "capacity"
  | "linkVitale"
  | "updatedAt"
  | "state"
  | "missingFields";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: SortKey;
  dir: SortDir;
}

export const DEFAULT_SORT: SortState = { key: "name", dir: "asc" };

const collator = new Intl.Collator("pt-BR", { numeric: true, sensitivity: "base" });

const STATE_ORDER: Record<PanelRow["state"], number> = {
  eligible: 0,
  draft: 1,
  inactive: 2,
  static: 3,
};

/** Valor semântico de ordenação por coluna (null = ausente, vai por último). */
function sortValue(row: PanelRow, key: SortKey): string | number | null {
  switch (key) {
    case "name": return row.name;
    case "price": return row.price;
    case "autonomyKm": return row.autonomyKm;
    case "capacity": return row.capacity;
    case "linkVitale": return row.linkVitale;
    case "updatedAt": {
      if (!row.updatedAt) return null;
      const t = new Date(row.updatedAt).getTime();
      return Number.isNaN(t) ? null : t;
    }
    case "state": return STATE_ORDER[row.state];
    case "missingFields": return row.missingFields.length;
  }
}

/**
 * Ordena as linhas. Nulos/ausentes sempre por último (em ambas direções).
 * Desempate estável por nome pt-BR e depois por id.
 */
export function sortPanelRows(rows: PanelRow[], sort: SortState): PanelRow[] {
  const { key, dir } = sort;
  const mul = dir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const va = sortValue(a, key);
    const vb = sortValue(b, key);
    if (va == null && vb == null) {
      // ambos ausentes: cai no desempate
    } else if (va == null) return 1;
    else if (vb == null) return -1;
    else {
      const cmp = typeof va === "string" || typeof vb === "string"
        ? collator.compare(String(va), String(vb))
        : va - vb;
      if (cmp !== 0) return cmp * mul;
    }
    const byName = collator.compare(a.name, b.name);
    if (byName !== 0) return byName;
    return collator.compare(a.id, b.id);
  });
}

/** Clique em cabeçalho: mesma coluna alterna direção; coluna nova começa asc. */
export function nextSort(current: SortState, key: SortKey): SortState {
  if (current.key === key) return { key, dir: current.dir === "asc" ? "desc" : "asc" };
  return { key, dir: "asc" };
}

// ---------- Sessão do painel ----------

export const PANEL_TOKEN_KEY = "vitale-painel-token";
export const PANEL_EXPIRES_KEY = "vitale-painel-expira";

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PanelStorages {
  /** Armazenamento de navegador (sessionStorage). */
  session: StorageLike;
  /** Armazenamento persistente (localStorage). */
  persistent: StorageLike;
}

export interface StoredPanelSession {
  token: string;
  expiresAt: string;
  remember: boolean;
}

/**
 * Grava a sessão. remember=true -> persistente (30 dias); false -> sessão (8h).
 * Sempre limpa o outro storage para não haver duplicidade.
 */
export function storePanelSession(
  storages: PanelStorages,
  token: string,
  expiresAt: string,
  remember: boolean,
): void {
  const target = remember ? storages.persistent : storages.session;
  const other = remember ? storages.session : storages.persistent;
  other.removeItem(PANEL_TOKEN_KEY);
  other.removeItem(PANEL_EXPIRES_KEY);
  target.setItem(PANEL_TOKEN_KEY, token);
  target.setItem(PANEL_EXPIRES_KEY, expiresAt);
}

/** Lê a sessão armazenada; retorna null se ausente ou expirada. */
export function readPanelSession(
  storages: PanelStorages,
  now: Date = new Date(),
): StoredPanelSession | null {
  for (const [storage, remember] of [
    [storages.session, false],
    [storages.persistent, true],
  ] as const) {
    const token = storage.getItem(PANEL_TOKEN_KEY);
    const expiresAt = storage.getItem(PANEL_EXPIRES_KEY);
    if (!token || !expiresAt) continue;
    const exp = new Date(expiresAt).getTime();
    if (Number.isNaN(exp) || exp <= now.getTime()) {
      storage.removeItem(PANEL_TOKEN_KEY);
      storage.removeItem(PANEL_EXPIRES_KEY);
      continue;
    }
    return { token, expiresAt, remember };
  }
  return null;
}

export function clearPanelSession(storages: PanelStorages): void {
  for (const s of [storages.session, storages.persistent]) {
    s.removeItem(PANEL_TOKEN_KEY);
    s.removeItem(PANEL_EXPIRES_KEY);
  }
}
