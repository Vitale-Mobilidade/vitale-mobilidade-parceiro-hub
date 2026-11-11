import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import jpeg from "npm:jpeg-js@0.4.4";
import { articleReferencesCover, COVER_BUCKET, coverObjectPath } from "../_shared/editorial-cover.ts";
import { podcastArticleCoverSource, podcastArticleSlug } from "../_shared/podcast-artwork-contract.ts";
import { MAX_PODCAST_ART_BYTES, squarePodcastArtwork } from "../_shared/podcast-artwork.ts";

export async function servePodcastCover(
  req: Request, params: URLSearchParams, db: SupabaseClient, projectUrl: string,
) {
  const slug = params.get("slug") ?? "";
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return new Response(null, { status: 404 });
  const { data: article, error } = await db.from("editorial_articles").select("id,og_image_url")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) return new Response(null, { status: 503 });
  const source = podcastArticleCoverSource(article?.og_image_url ?? null);
  if (!article || !source) return new Response(null, { status: 404 });

  const headers = new Headers({
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
  });
  if (params.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="${slug}-capa-quadrada.jpg"`);
  if (req.method === "HEAD") return new Response(null, { headers });
  try {
    let original: Uint8Array;
    if (source.searchParams.get("type") === "editorial-cover") {
      const fileId = source.searchParams.get("file") ?? "";
      if (!articleReferencesCover(article.og_image_url, projectUrl, article.id, fileId))
        return new Response(null, { status: 404 });
      const { data: file } = await db.storage.from(COVER_BUCKET).download(coverObjectPath(article.id, fileId));
      if (!file || file.size > MAX_PODCAST_ART_BYTES) return new Response(null, { status: 503 });
      original = new Uint8Array(await file.arrayBuffer());
    } else {
      const response = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(6000) });
      if (!response.ok || !response.body) return new Response(null, { status: 503 });
      const reader = response.body.getReader();
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.length;
          if (size > MAX_PODCAST_ART_BYTES) return new Response(null, { status: 503 });
          chunks.push(Uint8Array.from(value));
        }
      } finally {
        await reader.cancel().catch(() => {});
      }
      original = new Uint8Array(await new Blob(chunks).arrayBuffer());
    }
    const result = squarePodcastArtwork(original, jpeg);
    headers.set("Content-Length", String(result.byteLength));
    return new Response(Uint8Array.from(result), { headers });
  } catch {
    return new Response(null, { status: 503 });
  }
}
