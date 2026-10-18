/** Email needs larger assets than the lightweight catalog cards. Only fixed YouTube hosts are probed. */
const cache = new Map<string, { url: string; until: number }>();
export function jpegWidth(bytes: Uint8Array): number {
  if (bytes[0] !== 255 || bytes[1] !== 216) return 0;
  for (let i = 2; i + 8 < bytes.length;) {
    if (bytes[i++] !== 255) return 0;
    const marker = bytes[i++];
    if (marker === 216 || marker === 217) continue;
    const length = bytes[i] * 256 + bytes[i + 1];
    if (length < 2) return 0;
    if (
      [
        192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
      ].includes(marker)
    )
      return bytes[i + 5] * 256 + bytes[i + 6];
    i += length;
  }
  return 0;
}
export async function newsletterVideoImage(
  id: string,
  original?: string | null,
  request = fetch,
) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return original ?? undefined;
  const cached = cache.get(id);
  if (cached && cached.until > Date.now()) return cached.url;
  for (const variant of ["maxresdefault", "sddefault", "hqdefault"]) {
    const url = `https://i.ytimg.com/vi/${id}/${variant}.jpg`;
    try {
      const r = await request(url, {
        signal: AbortSignal.timeout(2000),
        redirect: "error",
      });
      if (!r.ok || !r.headers.get("content-type")?.startsWith("image/jpeg")) {
        await r.body?.cancel();
        continue;
      }
      if (Number(r.headers.get("content-length")) > 2_000_000) {
        await r.body?.cancel();
        continue;
      }
      const bytes = new Uint8Array(await r.arrayBuffer());
      if (bytes.length > 2_000_000 || jpegWidth(bytes) < 480) continue;
      if (cache.size > 500) cache.clear();
      cache.set(id, { url, until: Date.now() + 86_400_000 });
      return url;
    } catch {
      /* Images never block preparing an otherwise valid edition. */
    }
  }
  return original ?? undefined;
}
