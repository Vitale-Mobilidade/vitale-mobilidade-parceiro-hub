import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { articleReferencesCover, COVER_BUCKET, coverObjectPath, isCoverUuid } from "./editorial-cover.ts";

type ArticleCover = { id: string; video_id: string | null; title: string; og_image_url: string | null };

export async function readPublishedCoverSource(db: SupabaseClient, origin: string, article: ArticleCover, tryOriginal = true) {
  if (!isCoverUuid(article.id)) return null;
  const bucket = db.storage.from(COVER_BUCKET);
  const read = async (path: string) => {
    const { data, error } = await bucket.download(path);
    return !error && data && data.size > 0 && data.size <= 12 * 1024 * 1024
      ? new Uint8Array(await data.arrayBuffer()) : null;
  };
  if (tryOriginal && article.video_id) {
    const { data, error } = await db.from("youtube_editorial_sources")
      .select("cover_background:capture->coverBackground")
      .eq("article_id", article.id).eq("video_id", article.video_id).maybeSingle();
    if (error) throw Error("published_cover_source_unavailable");
    const source = data?.cover_background;
    const root = `${article.id}/backgrounds/`;
    if (source && typeof source === "object" && !Array.isArray(source)
      && source.title === article.title && typeof source.path === "string" && source.path.startsWith(root)) {
      const name = source.path.slice(root.length);
      const mime = name.endsWith(".png") && source.mime === "image/png" ? "image/png"
        : name.endsWith(".jpg") && source.mime === "image/jpeg" ? "image/jpeg" : null;
      if (mime && isCoverUuid(name.slice(0, -4))) {
        const bytes = await read(source.path);
        if (bytes) return { bytes, mime, original: true, frameEvidence: source.frameEvidence } as const;
      }
    }
  }
  let fileId: string | null = null;
  try { fileId = new URL(article.og_image_url ?? "").searchParams.get("file"); } catch { /* No canonical JPEG. */ }
  if (!isCoverUuid(fileId) || !articleReferencesCover(article.og_image_url, origin, article.id, fileId)) return null;
  const bytes = await read(coverObjectPath(article.id, fileId));
  return bytes ? { bytes, mime: "image/jpeg", original: false } as const : null;
}
