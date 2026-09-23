/**
 * Catálogo de vídeos (aba "Videos Youtube") — parsing puro, sem I/O.
 * Colunas: Data | Titulo | Link Youtube | Bikes. A coluna "Link YouTube" da aba de bikes (gid=0) é ignorada.
 *
 * Correspondência de bikes: cada célula "Bikes" é dividida por vírgula; cada token é normalizado
 * (normalizeName) e só é aceito por igualdade EXATA com um alias oficial (SHEET_NAME_ALIASES) ou um
 * ID conhecido (KNOWN_BIKE_IDS). Sem substring nem fallback "compacto": "V9 Max S", "V9 Max 20ah",
 * "GT20" e "GT20 Pro" não viram v9_max / ouxi_gt20 / ouxi_gt20_pro. Tokens com parênteses
 * ("V9 Max (duas baterias)") são tratados como variante e não são mapeados.
 */
import {
  KNOWN_BIKE_IDS,
  SHEET_NAME_ALIASES,
  normalizeName,
  parseCsvRows,
} from "../../supabase/functions/_shared/bike-sheet";

export const VIDEO_SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/1gIzIM3YOsT3tXLkYGqJMsZ26oY_mOc10SLaT0hzKOkc/gviz/tq?tqx=out:csv&sheet=Videos%20Youtube";

export type VideoItem = {
  videoId: string;
  title: string;
  /** ISO yyyy-mm-dd, ou null se a data da planilha for inválida. */
  date: string | null;
  url: string;
  thumbnail: string;
  bikeIds: string[];
  /** Tokens do campo Bikes que não correspondem a nenhum modelo conhecido. */
  unmatched: string[];
};

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

/** Extrai o ID de 11 caracteres de URLs youtube.com/youtu.be; null se inválida. */
export function parseYoutubeId(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(String(raw ?? "").trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  const host = u.hostname.toLowerCase().replace(/^(www\.|m\.)/, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.split("/")[1] ?? null;
  else if (host === "youtube.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/]+)/);
      id = m ? m[1] : null;
    }
  }
  return id && YT_ID_RE.test(id) ? id : null;
}

/** "08/04/2026" -> "2026-04-08" | null. */
export function parseBrDate(raw: string): string | null {
  const m = String(raw ?? "").trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const d = Number(m[1]), mo = Number(m[2]), y = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Token de modelo -> id oficial por igualdade exata normalizada; null se não houver. */
export function matchBikeToken(token: string): string | null {
  const t = token.trim();
  if (!t || /[()]/.test(t)) return null;
  const key = normalizeName(t);
  if (!key) return null;
  if (SHEET_NAME_ALIASES[key]) return SHEET_NAME_ALIASES[key];
  return (KNOWN_BIKE_IDS as readonly string[]).includes(key) ? key : null;
}

export function buildVideoCatalog(csv: string): VideoItem[] {
  const rows = parseCsvRows(csv);
  if (rows.length < 2) return [];
  const headers = rows[0].map((h) => normalizeName(h));
  const col = (n: string) => headers.indexOf(normalizeName(n));
  const iDate = col("Data"), iTitle = col("Titulo"), iLink = col("Link Youtube"), iBikes = col("Bikes");
  if (iTitle < 0 || iLink < 0) return [];
  const seen = new Set<string>();
  const out: VideoItem[] = [];
  for (const cells of rows.slice(1)) {
    const videoId = parseYoutubeId(cells[iLink] ?? "");
    const title = String(cells[iTitle] ?? "").replace(/\s+/g, " ").trim();
    if (!videoId || !title || seen.has(videoId)) continue;
    seen.add(videoId);
    const bikeIds: string[] = [];
    const unmatched: string[] = [];
    for (const tok of String(iBikes >= 0 ? cells[iBikes] ?? "" : "").split(",")) {
      const t = tok.trim();
      if (!t) continue;
      const id = matchBikeToken(t);
      if (id) { if (!bikeIds.includes(id)) bikeIds.push(id); }
      else unmatched.push(t);
    }
    out.push({
      videoId,
      title,
      date: iDate >= 0 ? parseBrDate(cells[iDate] ?? "") : null,
      // URL canônica: sem tracking nem marcador de tempo.
      url: `https://www.youtube.com/watch?v=${videoId}`,
      thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
      bikeIds,
      unmatched,
    });
  }
  // Mais recentes primeiro; sem data vão ao fim.
  return out.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
