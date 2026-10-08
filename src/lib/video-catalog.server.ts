// Public SSR metadata comes from the persistent catalog; a filtered sheet cannot shrink it.
import type { VideoItem } from './video-catalog';

const TTL_MS = 10 * 60 * 1000;
const TIMEOUT_MS = 5000;
let cache: { at: number; items: VideoItem[] } | null = null;

export async function fetchVideoCatalog(): Promise<VideoItem[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.items;
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return cache?.items ?? [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${url}/rest/v1/rpc/public_video_catalog`, {
      method:'POST',headers:{apikey:key,'Content-Type':'application/json'},
      body:'{}',signal:controller.signal,
    });
    if (!res.ok) throw new Error(`videos ${res.status}`);
    const items: VideoItem[] = await res.json();
    if (!Array.isArray(items)) throw new Error('invalid_video_catalog');
    if (items.length) cache = { at: Date.now(), items };
    return items;
  } catch (e) {
    console.error('[videos] persistent catalog unavailable',e);
    return cache?.items ?? [];
  } finally {
    clearTimeout(timer);
  }
}
