import type { SupabaseClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildPodcastRss } from "./podcast-rss";
import { PODCAST_AUDIO_BUCKET } from "../../supabase/functions/_shared/podcast-audio-contract";

const db: SupabaseClient = supabaseAdmin;
const noStore = { "Cache-Control": "no-store" };

export async function servePodcastFeed(head: boolean) {
  const { data: settings, error: settingsError } = await db.from("podcast_distribution_settings")
    .select("feed_enabled,verification_email").eq("singleton", true).maybeSingle();
  if (settingsError) return new Response(null, { status: 503, headers: noStore });
  if (!settings?.feed_enabled) return new Response(null, { status: 404, headers: noStore });
  const { data, error } = await db.from("podcast_released_episodes")
    .select("youtube_id,title,original_description,released_at,size_bytes")
    .order("released_at", { ascending: false }).order("youtube_id").limit(500);
  if (error) return new Response(null, { status: 503, headers: noStore });
  return new Response(head ? null : buildPodcastRss(data ?? [], settings.verification_email), {
    headers: { ...noStore, "Content-Type": "application/rss+xml; charset=utf-8" },
  });
}

export async function servePodcastAudio(request: Request, youtubeId: string) {
  if (!/^[A-Za-z0-9_-]{11}$/.test(youtubeId))
    return new Response(null, { status: 404, headers: noStore });
  const { data, error } = await db.from("podcast_released_episodes")
    .select("object_path,size_bytes").eq("youtube_id", youtubeId).maybeSingle();
  if (error) return new Response(null, { status: 503, headers: noStore });
  if (!data) return new Response(null, { status: 404, headers: noStore });
  const baseHeaders = new Headers({
    ...noStore, "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes",
  });
  if (request.method === "HEAD") {
    baseHeaders.set("Content-Length", String(data.size_bytes));
    return new Response(null, { headers: baseHeaders });
  }
  const range = request.headers.get("Range");
  if (range && !/^bytes=(?:\d+-\d*|-\d+)$/.test(range)) {
    baseHeaders.set("Content-Range", `bytes */${data.size_bytes}`);
    return new Response(null, { status: 416, headers: baseHeaders });
  }
  const storageOrigin = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!storageOrigin || !serviceKey) return new Response(null, { status: 503, headers: noStore });
  const objectPath = data.object_path.split("/").map(encodeURIComponent).join("/");
  const headers = new Headers({ apikey: serviceKey });
  if (!serviceKey.startsWith("sb_secret_")) headers.set("Authorization", `Bearer ${serviceKey}`);
  if (range) headers.set("Range", range);
  const upstream = await fetch(
    new URL(`/storage/v1/object/authenticated/${PODCAST_AUDIO_BUCKET}/${objectPath}`, storageOrigin),
    { headers, redirect: "error", signal: AbortSignal.timeout(20000) },
  ).catch(() => null);
  if (!upstream || ![200, 206, 416].includes(upstream.status)) {
    await upstream?.body?.cancel();
    return new Response(null, { status: 503, headers: noStore });
  }
  for (const name of ["Content-Length", "Content-Range"]) {
    const value = upstream.headers.get(name);
    if (value) baseHeaders.set(name, value);
  }
  return new Response(upstream.body, { status: upstream.status, headers: baseHeaders });
}
