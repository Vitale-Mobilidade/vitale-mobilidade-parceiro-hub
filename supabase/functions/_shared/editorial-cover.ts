/** Pure helpers for the manual AI cover pilot (editorial-admin, bike-image, frontend head, tests). */

export const COVER_BUCKET = "editorial-covers";
export const COVER_WIDTH = 1280;
export const COVER_HEIGHT = 720;
export const COVER_MAX_BYTES = 4 * 1024 * 1024;
export const COVER_THUMB_VARIANTS = ["maxresdefault", "sddefault", "hqdefault", "mqdefault"] as const;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export const isCoverUuid = (v: unknown): v is string => typeof v === "string" && UUID.test(v);

/** Only the exact official YouTube thumbnail of this video id is accepted as AI reference. */
export function isAllowedCoverThumbnail(raw: unknown, youtubeId: string): boolean {
  if (typeof raw !== "string" || !/^[A-Za-z0-9_-]{11}$/.test(youtubeId)) return false;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.hostname !== "i.ytimg.com" || url.search || url.hash || url.username || url.port) return false;
    return COVER_THUMB_VARIANTS.some((v) => url.pathname === `/vi/${youtubeId}/${v}.jpg`);
  } catch {
    return false;
  }
}

/** Returns JPEG dimensions when bytes are a structurally valid JPEG, else null. */
export function inspectJpeg(bytes: Uint8Array): { width: number; height: number } | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  if (bytes[bytes.length - 2] !== 0xff || bytes[bytes.length - 1] !== 0xd9) return null;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return null;
    const marker = bytes[i + 1];
    if (marker === 0xff) { i += 1; continue; }
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
    if (marker === 0xd8 || marker === 0xd9 || marker === 0xda) return null; // no frame header before scan
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (len < 2 || i + 2 + len > bytes.length) return null;
    const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSof) {
      if (len < 7) return null;
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    i += 2 + len;
  }
  return null;
}

export function coverObjectPath(articleId: string, fileId: string): string {
  if (!isCoverUuid(articleId) || !isCoverUuid(fileId)) throw new Error("invalid_cover_path");
  return `${articleId}/${fileId}.jpg`;
}

/** Canonical public URL, served by the existing public `bike-image` function. */
export function coverPublicUrl(supabaseUrl: string, articleId: string, fileId: string): string {
  if (!isCoverUuid(articleId) || !isCoverUuid(fileId)) throw new Error("invalid_cover_url");
  return `${supabaseUrl.replace(/\/+$/, "")}/functions/v1/bike-image?type=editorial-cover&id=${articleId}&file=${fileId}`;
}

/** True only when the article's og_image_url points exactly to this file. */
export function articleReferencesCover(ogImageUrl: unknown, supabaseUrl: string, articleId: string, fileId: string): boolean {
  try {
    return typeof ogImageUrl === "string" && ogImageUrl === coverPublicUrl(supabaseUrl, articleId, fileId);
  } catch {
    return false;
  }
}

/** Recognises an approved Vitale cover URL (drives OG width/height/type). */
export function isEditorialCoverUrl(raw: string | null | undefined): boolean {
  if (!raw) return false;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" && url.pathname.endsWith("/functions/v1/bike-image") &&
      url.searchParams.get("type") === "editorial-cover" &&
      isCoverUuid(url.searchParams.get("id")) && isCoverUuid(url.searchParams.get("file"));
  } catch {
    return false;
  }
}

export function decodeBase64Jpeg(input: unknown, maxBytes: number): Uint8Array | null {
  if (typeof input !== "string") return null;
  const b64 = input.replace(/^data:image\/jpeg;base64,/, "");
  if (b64.length > Math.ceil(maxBytes / 3) * 4 + 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return null;
  try {
    const bin = atob(b64);
    if (bin.length > maxBytes) return null;
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

export const COVER_PROMPT = [
  "Use the attached YouTube thumbnail only as a visual reference for the subject, product and mood.",
  "Create a NEW, original editorial background image in 16:9 landscape format for an electric-bike article.",
  "Do not reproduce the thumbnail layout. Absolutely NO text, letters, numbers, logos, watermarks, captions, UI or signage anywhere.",
  "Keep the lower third calm and slightly darker so a title can be overlaid later. Realistic, natural light, clean composition.",
].join(" ");
