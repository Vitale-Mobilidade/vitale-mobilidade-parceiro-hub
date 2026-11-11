import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { COVER_BUCKET, isCoverUuid } from "../_shared/editorial-cover.ts";
import { podcastArticleSlug } from "../_shared/podcast-artwork-contract.ts";

export async function servePodcastCover(req: Request, params: URLSearchParams, db: SupabaseClient) {
  const slug = params.get("slug") ?? "";
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return new Response(null, { status: 404 });
  const { data: article, error } = await db.from("editorial_articles").select("id,video_id,title")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) return new Response(null, { status: 503 });
  if (!article || !isCoverUuid(article.id)) return new Response(null, { status: 404 });

  const headers = new Headers({
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
  });
  if (params.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="${slug}-capa-quadrada.jpg"`);
  if (req.method === "HEAD") return new Response(null, { headers });
  try {
    let background: { bytes: Uint8Array; mime: "image/png" | "image/jpeg" } | null = null;
    if (article.video_id) {
      const { data, error: sourceError } = await db.from("youtube_editorial_sources")
        .select("cover_background:capture->coverBackground").eq("article_id", article.id)
        .eq("video_id", article.video_id).maybeSingle();
      if (sourceError) return new Response(null, { status: 503 });
      const source = data?.cover_background;
      const path = source?.path;
      if (typeof path === "string") {
        const root = `${article.id}/backgrounds/`;
        const fileName = path.startsWith(root) ? path.slice(root.length) : "";
        const id = fileName.slice(0, -4);
        const mime = fileName.endsWith(".png") && source.mime === "image/png" ? "image/png"
          : fileName.endsWith(".jpg") && source.mime === "image/jpeg" ? "image/jpeg" : null;
        if (isCoverUuid(id) && mime) {
          const { data: file, error: fileError } = await db.storage.from(COVER_BUCKET).download(path);
          if (fileError || !file || file.size > 12 * 1024 * 1024) return new Response(null, { status: 503 });
          background = { bytes: new Uint8Array(await file.arrayBuffer()), mime };
        }
      }
    }
    const { composeSquarePodcastCover } = await import("../_shared/cover-renderer/index.ts");
    const { bytes } = await composeSquarePodcastCover(background, article.title.normalize("NFC"));
    headers.set("Content-Length", String(bytes.byteLength));
    return new Response(Uint8Array.from(bytes), { headers });
  } catch {
    return new Response(null, { status: 503 });
  }
}
