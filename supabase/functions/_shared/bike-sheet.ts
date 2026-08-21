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

// ---------------- Snapshot ----------------

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

export interface SnapshotResult {
  bikes: SnapshotBike[];
  ignored: IgnoredRow[];
  recognizedCount: number;
  ignoredCount: number;
}

const REQUIRED_HEADERS = ["Nome", "Link Vitale", "Preço R$", "Autonomia", "Capacidade", "Descrição"];

function headerIndex(headers: string[], name: string): number {
  const target = normalizeName(name);
  return headers.findIndex((h) => normalizeName(h) === target);
}

/** Constrói o snapshot a partir do CSV cru. Lança erro só se o cabeçalho for inválido. */
export function buildSnapshotFromCsv(csv: string): SnapshotResult {
  const rows = parseCsv(csv);
  if (rows.length < 2) throw new Error("Planilha vazia ou inacessível");
  const headers = rows[0];
  const idx: Record<string, number> = {};
  for (const h of REQUIRED_HEADERS) {
    const i = headerIndex(headers, h);
    if (i < 0) throw new Error(`Coluna obrigatória ausente na planilha: ${h}`);
    idx[h] = i;
  }

  const bikes: SnapshotBike[] = [];
  const ignored: IgnoredRow[] = [];
  const seen = new Set<string>();

  for (let r = 1; r < rows.length; r++) {
    const cells = rows[r];
    const line = r + 1;
    const rawName = (cells[idx["Nome"]] ?? "").trim();
    if (!rawName) { ignored.push({ line, name: "", reason: "Nome vazio" }); continue; }

    const id = resolveBikeId(rawName);
    if (!id) { ignored.push({ line, name: rawName, reason: "Modelo desconhecido no catálogo" }); continue; }
    if (seen.has(id)) { ignored.push({ line, name: rawName, reason: "Linha duplicada para o mesmo modelo" }); continue; }

    const link = parseVitaleLink(cells[idx["Link Vitale"]] ?? "");
    if (!link) { ignored.push({ line, name: rawName, reason: "Link Vitale inválido" }); continue; }

    const price = parseBrlPrice(cells[idx["Preço R$"]] ?? "");
    if (price == null) { ignored.push({ line, name: rawName, reason: "Preço inválido" }); continue; }

    const autonomyKm = parseAutonomyKm(cells[idx["Autonomia"]] ?? "");
    if (autonomyKm == null) { ignored.push({ line, name: rawName, reason: "Autonomia inválida" }); continue; }

    const capacity = parseCapacity(cells[idx["Capacidade"]] ?? "");
    if (capacity == null) { ignored.push({ line, name: rawName, reason: "Capacidade inválida" }); continue; }

    const description = (cells[idx["Descrição"]] ?? "").trim();
    if (!description) { ignored.push({ line, name: rawName, reason: "Descrição vazia" }); continue; }

    seen.add(id);
    bikes.push({
      id,
      name: rawName.replace(/\s+/g, " ").trim(),
      linkVitale: link,
      price,
      autonomyKm,
      capacity,
      description,
      shortDescription: buildShortDescription(description),
    });
  }

  bikes.sort((a, b) => a.id.localeCompare(b.id));
  return { bikes, ignored, recognizedCount: bikes.length, ignoredCount: ignored.length };
}

/** Hash estável (FNV-1a hex) do conteúdo relevante do snapshot. */
export function snapshotHash(bikes: SnapshotBike[]): string {
  const payload = JSON.stringify(bikes);
  let h = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h ^= payload.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0") + ":" + payload.length.toString(16);
}
