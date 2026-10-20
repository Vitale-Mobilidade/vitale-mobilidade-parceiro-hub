import { createClient } from "@supabase/supabase-js";
import { composeNewsletterImage } from "./newsletter-compose.server";
import {
  COVER_BUCKET,
  isCoverUuid,
} from "../../supabase/functions/_shared/editorial-cover";

export function validNewsletterBackground(
  id: string,
  background: unknown,
): background is { path: string; mime: string } {
  if (!isCoverUuid(id) || !background || typeof background !== "object")
    return false;
  const b = background as { path?: unknown; mime?: unknown };
  return (
    typeof b.path === "string" &&
    new RegExp(`^${id}/backgrounds/[0-9a-f-]{36}\\.(png|jpg)$`).test(b.path) &&
    ((b.path.endsWith(".png") && b.mime === "image/png") ||
      (b.path.endsWith(".jpg") && b.mime === "image/jpeg"))
  );
}
export async function newsletterArticleImage(id: string): Promise<Response> {
  if (!isCoverUuid(id)) return new Response(null, { status: 400 });
  const url = process.env.SUPABASE_URL,
    key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return new Response(null, { status: 503 });
  try {
    const db = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: article } = await db
      .from("editorial_articles")
      .select("video_id")
      .eq("id", id)
      .eq("status", "published")
      .maybeSingle();
    if (!article) return new Response(null, { status: 404 });
    const { data: source } = await db
      .from("youtube_editorial_sources")
      .select("capture")
      .eq("article_id", id)
      .eq("video_id", article.video_id)
      .maybeSingle();
    const background = source?.capture?.coverBackground;
    if (!validNewsletterBackground(id, background))
      return new Response(null, { status: 404 });
    const { data: file } = await db.storage
      .from(COVER_BUCKET)
      .download(background.path);
    if (!file || file.size > 12 * 1024 * 1024)
      return new Response(null, { status: 404 });
    const result = composeNewsletterImage(
      new Uint8Array(await file.arrayBuffer()),
      background.mime,
    );
    return new Response(Buffer.from(result), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response(null, { status: 503 });
  }
}
