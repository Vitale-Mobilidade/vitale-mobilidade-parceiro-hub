import { PODCAST_ARTWORK_EDGE, podcastArticleSlug } from "../../supabase/functions/_shared/podcast-artwork-contract";

export function servePodcastArtwork(request: Request, file: string) {
  const slug = file.endsWith(".jpg") ? file.slice(0, -4) : "";
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return new Response(null, { status: 404 });
  const incoming = new URL(request.url);
  const destination = new URL(PODCAST_ARTWORK_EDGE);
  destination.searchParams.set("type", "podcast-cover");
  destination.searchParams.set("slug", slug);
  const version = incoming.searchParams.get("v");
  if (version && /^\d{1,14}$/.test(version)) destination.searchParams.set("v", version);
  if (incoming.searchParams.get("download") === "1") destination.searchParams.set("download", "1");
  return new Response(null, { status: 307, headers: { Location: destination.href, "Cache-Control": "no-store" } });
}
