import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { articleReferencesCover, coverObjectPath, COVER_BUCKET, isCoverUuid } from "../_shared/editorial-cover.ts";
import { independentPodcastCoverPath, podcastArticleSlug, preparedPodcastCoverPath, preparedPodcastInstagramPath } from "../_shared/podcast-artwork-contract.ts";

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
    "Cache-Control": portrait ? "public, max-age=3600, s-maxage=86400" : "public, max-age=300, s-maxage=300",
    "X-Content-Type-Options": "nosniff",
  });
  if (params.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="${slug}-capa-quadrada.jpg"`);
  if (req.method === "HEAD") return new Response(null, { headers });
  try {
    const bucket = db.storage.from(COVER_BUCKET);
    async function stored(path: string | null) {
      if (!path) return null;
      const { data } = await bucket.download(path);
      return data && data.size <= 8 * 1024 * 1024 ? data : null;
    }
    if (!portrait) {
      const independent = await stored(independentPodcastCoverPath(article.id));
      if (independent) {
        headers.set("Content-Length", String(independent.size));
        return new Response(independent, { headers });
      }
      const byVersion = params.get("layout") === "3"
        ? preparedPodcastCoverPath(article.id, params.get("v") ?? "") : null;
      let legacy = await stored(byVersion);
      if (!legacy && article.video_id) {
        const { data, error: queueError } = await db.from("podcast_episode_queue")
          .select("prepared_cover_path").eq("youtube_id", article.video_id).maybeSingle();
        if (queueError) return new Response(null, { status: 503 });
        const saved = data?.prepared_cover_path;
        const version = typeof saved === "string" ? /\/v3-(\d{1,14})\.jpg$/.exec(saved)?.[1] : undefined;
        if (version && saved !== byVersion && preparedPodcastCoverPath(article.id, version) === saved)
          legacy = await stored(saved);
      }
      if (legacy) {
        headers.set("Content-Length", String(legacy.size));
        return new Response(legacy, { headers });
      }
      const { composeSquarePodcastCover } = await import("../_shared/cover-renderer/index.ts");
      const { bytes } = await composeSquarePodcastCover(null, article.title.normalize("NFC"));
      headers.set("Content-Length", String(bytes.byteLength));
      return new Response(Uint8Array.from(bytes), { headers });
    }
    const legacyInstagram = await stored(preparedPodcastInstagramPath(article.id, params.get("v") ?? ""));
    if (legacyInstagram) {
      headers.set("Content-Length", String(legacyInstagram.size));
      return new Response(legacyInstagram, { headers });
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
        }
      }
    }
    if (!background) {
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
    const { composeInstagramPostCover } = await import("../_shared/cover-renderer/index.ts");
    const { bytes } = await composeInstagramPostCover(background, article.title.normalize("NFC"));
    headers.set("Content-Length", String(bytes.byteLength));
    return new Response(Uint8Array.from(bytes), { headers });
  } catch {
    return new Response(null, { status: 503 });
  }
}
