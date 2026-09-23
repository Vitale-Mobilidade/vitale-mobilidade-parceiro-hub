// Server-only: leitura read-only da aba "Videos Youtube" com cache em memória.
import { VIDEO_SHEET_CSV_URL, buildVideoCatalog, type VideoItem } from "./video-catalog";

const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5000;
let cache: { at: number; items: VideoItem[] } | null = null;

export async function fetchVideoCatalog(): Promise<VideoItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(VIDEO_SHEET_CSV_URL, { signal: controller.signal });
    if (!res.ok) throw new Error(`videos ${res.status}`);
    const items = buildVideoCatalog(await res.text());
    if (items.length) cache = { at: Date.now(), items };
    return items;
  } catch (e) {
    console.error("[videos] leitura falhou", e);
    return cache?.items ?? []; // stale em falha; vazio só omite a seção
  } finally {
    clearTimeout(timer);
  }
}
