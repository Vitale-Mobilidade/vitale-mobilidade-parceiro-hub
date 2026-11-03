import { publicClassifiedsClient } from "./bike-classifieds-repository.server";
import { z } from "zod";
import { MEMBER_MEDIA_BUCKET } from "./bike-classifieds";
/** Stable public image URL, rechecking publication on every request; no private keys. */
export async function publicBikeImage(id: string): Promise<Response> {
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'",
    "Referrer-Policy": "no-referrer",
  };
  if (!z.string().uuid().safeParse(id).success)
    return new Response(null, { status: 404, headers });
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const key =
    process.env.SUPABASE_PUBLISHABLE_KEY ??
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return new Response(null, { status: 503, headers });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6000);
  try {
    const db = publicClassifiedsClient(url, key, controller.signal);
    const { data: path, error } = await db.rpc("member_bike_image_public", {
      p_id: id,
    });
    if (error) return new Response(null, { status: 503, headers });
    if (typeof path !== "string")
      return new Response(null, { status: 404, headers });
    const { data: blob, error: downloadError } = await db.storage
      .from(MEMBER_MEDIA_BUCKET)
      .download(path);
    if (downloadError || !blob)
      return new Response(null, { status: 404, headers });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    if (
      bytes.length < 12 ||
      bytes.length > 2097152 ||
      new TextDecoder().decode(bytes.slice(0, 4)) !== "RIFF" ||
      new TextDecoder().decode(bytes.slice(8, 12)) !== "WEBP"
    )
      return new Response(null, { status: 404, headers });
    return new Response(bytes, {
      headers: {
        ...headers,
        "Content-Type": "image/webp",
        "Content-Length": String(bytes.length),
      },
    });
  } catch {
    return new Response(null, { status: 503, headers });
  } finally {
    clearTimeout(timer);
  }
}
