import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { articleReferencesCover, coverObjectPath, COVER_BUCKET, isCoverUuid } from "../_shared/editorial-cover.ts";
import { podcastArticleSlug, preparedPodcastCoverPath, preparedPodcastInstagramPath } from "../_shared/podcast-artwork-contract.ts";

export async function servePodcastCover(req: Request, params: URLSearchParams, db: SupabaseClient) {
  const portrait = params.get("layout") === "4";
  const slug = params.get("slug") ?? "";
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return new Response(null, { status: 404 });
  const { data: article, error } = await db.from("editorial_articles").select("id,video_id,title,updated_at,og_image_url")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) return new Response(null, { status: 503 });
  if (!article || !isCoverUuid(article.id)) return new Response(null, { status: 404 });
  if (portrait && params.get("v") !== String(Date.parse(article.updated_at)))
    return new Response(null, { status: 409, headers: { "X-Media-Error": "podcast_instagram_article_version_changed" } });

  const headers = new Headers({
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
  });
  if (params.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="${slug}-capa-quadrada.jpg"`);
  if (req.method === "HEAD") return new Response(null, { headers });
  try {
    const preparedPath = portrait ? preparedPodcastInstagramPath(article.id, params.get("v") ?? "") : params.get("layout") === "3"
      ? preparedPodcastCoverPath(article.id, params.get("v") ?? "") : null;
    if (preparedPath) {
      const { data: prepared } = await db.storage.from(COVER_BUCKET).download(preparedPath);
      if (prepared && prepared.size <= 8 * 1024 * 1024) {
        headers.set("Content-Length", String(prepared.size));
        return new Response(prepared, { headers });
      }
    }
    let background: { bytes: Uint8Array; mime: "image/png" | "image/jpeg" } | null = null;
    if (article.video_id) {
      const { data, error: sourceError } = await db.from("youtube_editorial_sources")
        .select("cover_background:capture->coverBackground").eq("article_id", article.id)
        .eq("video_id", article.video_id).maybeSingle();
      if (sourceError) return new Response(null, { status: 503 });
      const source = data?.cover_background;
      if (source && typeof source === "object" && !Array.isArray(source) && typeof source.path === "string") {
        const path = source.path;
        const root = `${article.id}/backgrounds/`;
        const fileName = path.startsWith(root) ? path.slice(root.length) : "";
        const id = fileName.slice(0, -4);
        const mime = fileName.endsWith(".png") && source.mime === "image/png" ? "image/png"
          : fileName.endsWith(".jpg") && source.mime === "image/jpeg" ? "image/jpeg" : null;
        if (isCoverUuid(id) && mime) {
          const { data: file, error: fileError } = await db.storage.from(COVER_BUCKET).download(path);
          if (file && !fileError && file.size <= 12 * 1024 * 1024)
            background = { bytes: new Uint8Array(await file.arrayBuffer()), mime };
          else if (!portrait) return new Response(null, { status: 503 });
        }
      }
    }
    if (portrait && !background) {
      // Never fetch arbitrary URLs: exact published cover identity, same origin, private Storage only.
      let fileId: string | null = null;
      try { fileId = new URL(article.og_image_url).searchParams.get("file"); } catch { /* fail closed */ }
      if (!isCoverUuid(fileId) || !articleReferencesCover(article.og_image_url, new URL(req.url).origin, article.id, fileId))
        return new Response(null, { status: 422, headers: { "X-Media-Error": "podcast_instagram_original_missing" } });
      const { data: published, error: publishedError } = await db.storage.from(COVER_BUCKET).download(coverObjectPath(article.id, fileId));
      if (publishedError || !published || published.size > 12 * 1024 * 1024)
        return new Response(null, { status: 422, headers: { "X-Media-Error": "podcast_instagram_original_missing" } });
      const { containPublishedInstagramCover } = await import("../_shared/cover-renderer/index.ts");
      const { bytes } = await containPublishedInstagramCover(new Uint8Array(await published.arrayBuffer()));
      headers.set("Content-Length", String(bytes.byteLength));
      return new Response(Uint8Array.from(bytes), { headers });
    }
    const { composeSquarePodcastCover, composeInstagramPostCover } = await import("../_shared/cover-renderer/index.ts");
    const { bytes } = portrait && background
      ? await composeInstagramPostCover(background, article.title.normalize("NFC"))
      : await composeSquarePodcastCover(background, article.title.normalize("NFC"));
    headers.set("Content-Length", String(bytes.byteLength));
    return new Response(Uint8Array.from(bytes), { headers });
  } catch {
    return new Response(null, { status: 503 });
  }
}
