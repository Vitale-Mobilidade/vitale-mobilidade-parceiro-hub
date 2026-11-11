import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { PODCAST_AUDIO_BUCKET } from "../_shared/podcast-audio-contract.ts";

const noStore = { "Cache-Control": "no-store" };

export async function serveReleasedPodcastMedia(request: Request, videoId: string, db: SupabaseClient) {
  const { data: episode, error } = await db.from("podcast_released_episodes")
    .select("object_path,size_bytes").eq("youtube_id", videoId).maybeSingle();
  if (error) return new Response(null, { status: 503, headers: noStore });
  if (!episode) return new Response(null, { status: 404, headers: noStore });

  const headers = new Headers({ ...noStore, "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes" });
  if (request.method === "HEAD") {
    headers.set("Content-Length", String(episode.size_bytes));
    return new Response(null, { headers });
  }
  const range = request.headers.get("Range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    headers.set("Content-Range", `bytes */${episode.size_bytes}`);
    return new Response(null, { status: 416, headers });
  }
  const { data: signed } = await db.storage.from(PODCAST_AUDIO_BUCKET).createSignedUrl(episode.object_path, 60);
  if (!signed?.signedUrl) return new Response(null, { status: 503, headers: noStore });
  const upstream = await fetch(signed.signedUrl, {
    headers: range ? { Range: range } : undefined,
    redirect: "error", signal: AbortSignal.timeout(12000),
  }).catch(() => null);
  if (!upstream || ![200, 206, 416].includes(upstream.status)
    || (upstream.status !== 416 && !/^audio\/mpeg(?:;|$)/i.test(upstream.headers.get("Content-Type") ?? ""))) {
    await upstream?.body?.cancel();
    return new Response(null, { status: 503, headers: noStore });
  }
  if (upstream.status === 416) {
    await upstream.body?.cancel();
    headers.set("Content-Range", `bytes */${episode.size_bytes}`);
    return new Response(null, { status: 416, headers });
  }
  for (const name of ["Content-Length", "Content-Range"]) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
