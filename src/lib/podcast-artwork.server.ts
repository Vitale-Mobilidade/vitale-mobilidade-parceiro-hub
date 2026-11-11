import jpeg from "jpeg-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { inspectJpeg } from "../../supabase/functions/_shared/editorial-cover";
import { podcastArticleCoverSource, podcastArticleSlug } from "./podcast-editorial";

const SIDE = 1400;
const MAX_BYTES = 4 * 1024 * 1024;

export function squarePodcastArtwork(bytes: Uint8Array): Uint8Array {
  const dimensions = inspectJpeg(bytes);
  if (!dimensions || bytes.length > MAX_BYTES)
    throw new Error("Invalid podcast artwork");
  if (dimensions.width === dimensions.height && dimensions.width >= SIDE && dimensions.width <= 3000)
    return bytes;
  if (dimensions.width * dimensions.height > 4_200_000) throw new Error("Podcast artwork dimensions too large");

  const { width, height, data } = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 64 });
  const scale = SIDE / Math.max(width, height);
  const artWidth = Math.round(width * scale);
  const artHeight = Math.round(height * scale);
  const left = Math.floor((SIDE - artWidth) / 2);
  const top = Math.floor((SIDE - artHeight) / 2);
  const output = new Uint8Array(SIDE * SIDE * 4);
  for (let y = 0; y < SIDE; y++) {
    const localY = y - top;
    for (let x = 0; x < SIDE; x++) {
      const localX = x - left;
      const to = (y * SIDE + x) * 4;
      if (localX >= 0 && localX < artWidth && localY >= 0 && localY < artHeight) {
        const sourceX = Math.min(width - 1, Math.floor(localX / scale));
        const sourceY = Math.min(height - 1, Math.floor(localY / scale));
        const from = (sourceY * width + sourceX) * 4;
        output[to] = data[from];
        output[to + 1] = data[from + 1];
        output[to + 2] = data[from + 2];
      } else {
        output[to] = 8;
        output[to + 1] = 38;
        output[to + 2] = 31;
      }
      output[to + 3] = 255;
    }
  }
  return jpeg.encode({ data: output, width: SIDE, height: SIDE }, 83).data;
}

export async function servePodcastArtwork(request: Request, file: string) {
  const slug = file.endsWith(".jpg") ? file.slice(0, -4) : "";
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return new Response(null, { status: 404 });
  const { data, error } = await supabaseAdmin.from("editorial_articles").select("og_image_url")
    .eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) return new Response(null, { status: 503 });
  const source = podcastArticleCoverSource(data?.og_image_url ?? null);
  if (!source) return new Response(null, { status: 404 });

  const headers = {
    "Content-Type": "image/jpeg",
    "Cache-Control": "public, max-age=3600, s-maxage=86400",
    "X-Content-Type-Options": "nosniff",
  };
  if (request.method === "HEAD") return new Response(null, { headers });
  try {
    const upstream = await fetch(source, { redirect: "error", signal: AbortSignal.timeout(6000) });
    const length = Number(upstream.headers.get("Content-Length"));
    if (!upstream.ok || !upstream.body || length > MAX_BYTES) {
      await upstream.body?.cancel();
      return new Response(null, { status: 503 });
    }
    const reader = upstream.body.getReader();
    const chunks: Uint8Array<ArrayBuffer>[] = [];
    let total = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        total += value.length;
        if (total > MAX_BYTES) throw new Error("Podcast artwork too large");
        chunks.push(Uint8Array.from(value));
      }
    } finally {
      await reader.cancel().catch(() => {});
    }
    const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
    return new Response(Uint8Array.from(squarePodcastArtwork(bytes)), { headers });
  } catch {
    return new Response(null, { status: 503 });
  }
}
