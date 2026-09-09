/**
 * Parsing / normalização da planilha oficial de catálogo (Google Sheets).
 *
 * IMPORTANTE: este módulo é puro (sem APIs Deno/Node) porque é usado tanto pela
 * Edge Function `sync-bike-catalog` quanto pelos testes do frontend (vitest).
 *
 * Colunas oficiais (únicas consideradas):
 *   Nome | Link Vitale | Preço R$ | Autonomia | Capacidade | Descrição
 * As colunas "Link YouTube" e "Video Gravado" são ignoradas por completo.
 */

export const SHEET_ID = "1gIzIM3YOsT3tXLkYGqJMsZ26oY_mOc10SLaT0hzKOkc";
export const SHEET_GID = "0";
export const SHEET_CSV_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${SHEET_GID}`;
export const SHEET_PUBLIC_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=${SHEET_GID}`;

/** IDs válidos do catálogo estático — nenhuma linha nova entra sem metadados. */
export const KNOWN_BIKE_IDS = [
  "ft03", "v20_mini", "v9_max", "v10_max", "v40_pro", "v8_pro", "v8_pro_s",
  "v8_ultra", "ouxi_gt20", "ouxi_gt20_pro", "coswheel_gt20", "gt2000",
  "v29_pro", "v35", "v20_pro", "s8", "bw02", "f6_pro_s", "d50_cross",
] as const;

/** Aliases normalizados (chave normalizada -> id do catálogo). */
export const SHEET_NAME_ALIASES: Record<string, string> = {
  ft03: "ft03",
  panda_ft03: "ft03",
  v20_mini: "v20_mini",
  v9_max: "v9_max",
  v10_max: "v10_max",
  v40_pro: "v40_pro",
  v8_pro: "v8_pro",
  v8_pro_s: "v8_pro_s",
  v8_ultra: "v8_ultra",
  ouxi_gt20: "ouxi_gt20",
  panda_gt20: "ouxi_gt20",
  ouxi_gt20_pro: "ouxi_gt20_pro",
  panda_gt20_pro: "ouxi_gt20_pro",
  coswheel_gt20: "coswheel_gt20",
  gt2000: "gt2000",
  wanshida_gt2000: "gt2000",
  v29_pro: "v29_pro",
  v35: "v35",
  v20_pro: "v20_pro",
  s8: "s8",
  honeywhale_s8: "s8",
  bw02: "bw02",
  honeywhale_bw02: "bw02",
  f6_pro_s: "f6_pro_s",
  honeywhale_f6_pro_s: "f6_pro_s",
  d50_cross: "d50_cross",
};

/** Normaliza um nome: sem acentos, sem parênteses, minúsculo, separado por "_". */
export function normalizeName(raw: string): string {
  return (raw ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/** Resolve o id do catálogo a partir do nome da planilha (ou null). */
export function resolveBikeId(rawName: string): string | null {
  const key = normalizeName(rawName);
  if (!key) return null;
  if (SHEET_NAME_ALIASES[key]) return SHEET_NAME_ALIASES[key];
  if ((KNOWN_BIKE_IDS as readonly string[]).includes(key)) return key;
  // fallback: nome da planilha com parênteses já removidos e sufixos comuns
  const compact = key.replace(/_/g, "");
  for (const [alias, id] of Object.entries(SHEET_NAME_ALIASES)) {
    if (alias.replace(/_/g, "") === compact) return id;
  }
  return null;
}

/** "R$ 4.849,00" -> 4849 | null se inválido. */
export function parseBrlPrice(raw: string): number | null {
  if (raw == null) return null;
  const cleaned = String(raw)
    .replace(/\s|\u00a0/g, "")
    .replace(/r\$/i, "")
    .replace(/[^0-9.,-]/g, "");
  if (!cleaned) return null;
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) return null;
  return Math.round(value * 100) / 100;
}

/** "Até 100km" / "até 40 km" -> 100 | null. */
export function parseAutonomyKm(raw: string): number | null {
  if (raw == null) return null;
  const match = String(raw).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0 || value > 1000) return null;
  return Math.round(value);
}

/** "2 pessoas" -> 2 | "1 pessoa" -> 1 | null. */
export function parseCapacity(raw: string): 1 | 2 | null {
  if (raw == null) return null;
  const text = String(raw).toLowerCase();
  const match = text.match(/(\d+)/);
  if (match) {
    const n = Number(match[1]);
    if (n === 1) return 1;
    if (n === 2) return 2;
    return null;
  }
  if (/duas|dois/.test(text)) return 2;
  if (/uma|um\b/.test(text)) return 1;
  return null;
}

const MELI_LINK_RE = /^https:\/\/meli\.la\/[A-Za-z0-9]+$/;

/** Sanitiza e valida o Link Vitale. Retorna null se inválido. */
export function parseVitaleLink(raw: string): string | null {
  const clean = String(raw ?? "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, "")
    .trim();
  return MELI_LINK_RE.test(clean) ? clean : null;
}

/** URL pública de imagem: apenas HTTPS. Retorna null se inválida. */
export function parseImageUrl(raw: string): string | null {
  const clean = String(raw ?? "").replace(/\s+/g, "").trim();
  if (!clean) return null;
  if (!/^https:\/\/[^\s"'<>]+$/i.test(clean)) return null;
  try {
    const u = new URL(clean);
    if (u.protocol !== "https:") return null;
    if (!u.hostname.includes(".")) return null;
    return clean;
  } catch {
    return null;
  }
}

/** "150 kg" -> 150 | null (faixa plausível 40–400). */
export function parseWeightSupportKg(raw: string): number | null {
  if (raw == null) return null;
  const match = String(raw).replace(",", ".").match(/(\d+(?:\.\d+)?)/);
  if (!match) return null;
  const value = Math.round(Number(match[1]));
  if (!Number.isFinite(value) || value < 40 || value > 400) return null;
  return value;
}

/** Lista separada por vírgula / ponto-e-vírgula / barra / quebra de linha. */
export function parseList(raw: string): string[] {
  return String(raw ?? "")
    .split(/[,;|\n\/]+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length > 0);
}

/** Coluna "Ativa": só desativa em valores negativos explícitos. */
export function parseAtiva(raw: string): boolean {
  const text = String(raw ?? "").trim().toLowerCase();
  if (!text) return true;
  return !/^(n|nao|não|no|false|0|inativa|inativo|off)$/.test(text);
}

/**
 * Coluna oficial "Status" da planilha — fonte da elegibilidade.
 * "Elegível" => true | "Não Elegível" => false | vazio/desconhecido => null.
 * Normaliza acentos, caixa e espaços de forma segura (nunca assume elegível).
 */
export function parseSheetStatus(raw: string): boolean | null {
  const key = normalizeName(raw);
  if (!key) return null;
  if (key === "elegivel" || key === "eleg_vel" || key === "sim") return true;
  if (
    key === "nao_elegivel" || key === "n_o_eleg_vel" || key === "inelegivel" ||
    key === "nao" || key === "nao_elegive"
  ) return false;
  return null;
}


/** ID estável a partir da coluna ID (se houver) ou do nome. */
export function buildStableId(rawId: string, rawName: string): string | null {
  const fromId = normalizeName(rawId);
  if (fromId) return fromId;
  const fromName = normalizeName(rawName);
  return fromName || null;
}

/**
 * Versão curta e determinística da descrição (sem IA).
 * Usa as primeiras frases/linhas úteis até ~200 caracteres.
 */
export function buildShortDescription(full: string, maxLen = 200): string {
  const flat = String(full ?? "")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return "";
  if (flat.length <= maxLen) return flat;
  const slice = flat.slice(0, maxLen + 1);
  const lastStop = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("; "));
  if (lastStop > 80) return slice.slice(0, lastStop + 1).trim();
  const lastSpace = slice.lastIndexOf(" ");
  return `${slice.slice(0, lastSpace > 80 ? lastSpace : maxLen).trim()}…`;
}

// ---------------- CSV ----------------

/** Parser CSV RFC4180 (suporta aspas e quebras de linha dentro de campos). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

/** Igual a parseCsv, mas preserva linhas totalmente vazias (para contá-las como blank). */
export function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const src = String(text ?? "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
      continue;
    }
    if (c === '"') { inQuotes = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

// ---------------- Snapshot ----------------

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
  /** true quando o modelo não existe no catálogo estático. */
  isNew: boolean;
  /** eligible = linha completa; draft = pendente (não publicável); inactive = "Ativa" = não. */
  status: SnapshotBikeStatus;
  /** Lista legível do que falta para a bike ficar publicável. */
  missingFields: string[];
  line: number;
  /**
   * Coluna Status da planilha (fonte oficial da elegibilidade).
   * true = Elegível | false = Não Elegível | null = ausente/desconhecido.
   */
  sheetEligible: boolean | null;
  // --- Colunas opcionais (podem ainda não existir na planilha) ---
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

/** Linha NOMEADA porém incompleta: nunca entra no quiz, sempre visível no painel. */
export interface PendingRow {
  id: string | null;
  name: string;
  line: number;
  isNew: boolean;
  missingFields: string[];
  sheetEligible: boolean | null;
}

export interface SnapshotResult {
  bikes: SnapshotBike[];
  /** Linhas nomeadas incompletas — pendentes, nunca bloqueiam as válidas. */
  pending: PendingRow[];
  /** Erros estruturais de linha (id indefinido/duplicado). Também não bloqueiam. */
  ignored: IgnoredRow[];
  recognizedCount: number;
  pendingCount: number;
  ignoredCount: number;
  draftCount: number;
  /** Linhas sem Nome e sem dados — ignoradas sem erro. */
  blankCount: number;
  /** Mantido por compatibilidade: linhas ruins nunca invalidam o snapshot. */
  valid: boolean;
}

const REQUIRED_HEADERS = ["Nome", "Link Vitale", "Preço R$", "Autonomia", "Capacidade", "Descrição"];

/** Colunas opcionais suportadas. "Imagem da Bike" é o nome oficial; "Imagem" é alias. */
export const OPTIONAL_HEADERS = [
  "ID", "Status", "Imagem da Bike", "Imagem", "Peso Suportado", "Usos", "Terrenos",
  "Pontos Fortes", "Diferencial", "Perfil Indicado", "Ativa",
] as const;

function headerIndex(headers: string[], name: string): number {
  const target = normalizeName(name);
  return headers.findIndex((h) => normalizeName(h) === target);
}

/**
 * Constrói o snapshot a partir do CSV cru.
 *
 * Regras:
 *  - Linhas válidas SEMPRE são reconhecidas, independentemente de outras linhas ruins.
 *  - Linha nomeada incompleta vira pendência explícita (campos faltantes listados).
 *  - Linha sem Nome (mesmo com Status preenchido por validação/default) é vazia.
 *  - Só o cabeçalho inválido lança erro.
 */
export function buildSnapshotFromCsv(csv: string): SnapshotResult {
  const rows = parseCsvRows(csv);
  if (rows.filter((r) => r.some((c) => c.trim() !== "")).length < 2) throw new Error("Planilha vazia ou inacessível");
  const headers = rows[0];
  const idx: Record<string, number> = {};
  for (const h of REQUIRED_HEADERS) {
    const i = headerIndex(headers, h);
    if (i < 0) throw new Error(`Coluna obrigatória ausente na planilha: ${h}`);
    idx[h] = i;
  }
  const opt: Record<string, number> = {};
  for (const h of OPTIONAL_HEADERS) opt[h] = headerIndex(headers, h);

  const cell = (cells: string[], i: number) => (i >= 0 ? (cells[i] ?? "") : "");
  const statusIdx = opt["Status"];
  const hasStatusColumn = statusIdx >= 0;

  const bikes: SnapshotBike[] = [];
  const pending: PendingRow[] = [];
  const ignored: IgnoredRow[] = [];
  let blankCount = 0;
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const line = r + 1;

    const rawName = (cells[idx["Nome"]] ?? "").trim();
    if (!rawName) {
      // Sem Nome: a coluna Status pode vir preenchida por validação/default da
      // planilha — isso NÃO transforma a linha em pendência.
      const hasData = cells.some((c, i) => i !== statusIdx && (c ?? "").trim() !== "");
      if (!hasData) { blankCount++; continue; }
      ignored.push({ line, name: "", reason: "Linha sem Nome com dados preenchidos" });
      continue;
    }

    const rawId = cell(cells, opt["ID"]).trim();
    const knownId = resolveBikeId(rawId) ?? resolveBikeId(rawName);
    const isNew = !knownId;
    const id = knownId ?? buildStableId(rawId, rawName);
    if (!id) { ignored.push({ line, name: rawName, reason: "Não foi possível derivar um ID estável" }); continue; }
    if (seen.has(id)) { ignored.push({ line, name: rawName, reason: "Linha duplicada para o mesmo modelo" }); continue; }
    seen.add(id);

    const sheetEligible = hasStatusColumn ? parseSheetStatus(cell(cells, statusIdx)) : null;

    // Coleta TODOS os campos faltantes/inválidos (sem abortar na primeira falha).
    const missingFields: string[] = [];
    const link = parseVitaleLink(cell(cells, idx["Link Vitale"]));
    if (!link) missingFields.push("Link Vitale");
    const price = parseBrlPrice(cell(cells, idx["Preço R$"]));
    if (price == null) missingFields.push("Preço R$");
    const autonomyKm = parseAutonomyKm(cell(cells, idx["Autonomia"]));
    if (autonomyKm == null) missingFields.push("Autonomia");
    const capacity = parseCapacity(cell(cells, idx["Capacidade"]));
    if (capacity == null) missingFields.push("Capacidade");
    const description = cell(cells, idx["Descrição"]).trim();
    if (!description) missingFields.push("Descrição");
    // Status vazio/desconhecido em linha nomeada é pendência explícita.
    if (hasStatusColumn && sheetEligible === null) missingFields.push("Status (Elegível / Não Elegível)");

    if (missingFields.length > 0 || !link || price == null || autonomyKm == null || capacity == null) {
      pending.push({ id, name: rawName.replace(/\s+/g, " ").trim(), line, isNew, missingFields, sheetEligible });
      continue;
    }

    // Colunas opcionais. Imagem: oficial "Imagem da Bike", alias "Imagem".
    const imgIdx = opt["Imagem da Bike"] >= 0 ? opt["Imagem da Bike"] : opt["Imagem"];
    const image = parseImageUrl(cell(cells, imgIdx)) ?? undefined;
    const weightSupportKg = parseWeightSupportKg(cell(cells, opt["Peso Suportado"])) ?? undefined;
    const bestFor = parseList(cell(cells, opt["Usos"]));
    const terrains = parseList(cell(cells, opt["Terrenos"]));
    const strengths = parseList(cell(cells, opt["Pontos Fortes"]));
    const diferencial = cell(cells, opt["Diferencial"]).replace(/\s+/g, " ").trim();
    const perfilIndicado = cell(cells, opt["Perfil Indicado"]).replace(/\s+/g, " ").trim();
    const ativa = parseAtiva(cell(cells, opt["Ativa"]));

    bikes.push({
      id,
      name: rawName.replace(/\s+/g, " ").trim(),
      linkVitale: link,
      price,
      autonomyKm,
      capacity,
      description,
      shortDescription: buildShortDescription(description),
      isNew,
      status: ativa ? "eligible" : "inactive",
      missingFields: [],
      line,
      sheetEligible,
      ...(image ? { image } : {}),
      ...(weightSupportKg ? { weightSupportKg } : {}),
      ...(bestFor.length ? { bestFor } : {}),
      ...(terrains.length ? { terrains } : {}),
      ...(strengths.length ? { strengths } : {}),
      ...(diferencial ? { diferencial } : {}),
      ...(perfilIndicado ? { perfilIndicado } : {}),
    });
  }

  bikes.sort((a, b) => a.id.localeCompare(b.id));
  pending.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const draftCount = bikes.filter((b) => b.status !== "eligible").length;
  return {
    bikes,
    pending,
    ignored,
    recognizedCount: bikes.length,
    pendingCount: pending.length,
    ignoredCount: ignored.length,
    draftCount,
    blankCount,
    valid: true,
  };
}


/** Hash estável (FNV-1a hex) do conteúdo relevante do snapshot (bikes + pendências). */
export function snapshotHash(bikes: SnapshotBike[], pending: PendingRow[] = []): string {
  const payload = JSON.stringify([bikes, pending]);

  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + payload.length.toString(16);
}
