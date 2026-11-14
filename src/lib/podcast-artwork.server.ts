import { PODCAST_ARTWORK_EDGE, podcastArticleSlug } from "../../supabase/functions/_shared/podcast-artwork-contract";

export function servePodcastArtwork(request: Request, file: string) {
  const portrait = file.endsWith(".ig4.jpg");
  const versioned = file.endsWith(".v3.jpg");
  const slug = portrait ? file.slice(0, -8) : versioned ? file.slice(0, -7) : file.endsWith(".jpg") ? file.slice(0, -4) : "";
  if (slug.length > 120 || !podcastArticleSlug.test(slug)) return new Response(null, { status: 404 });
  const incoming = new URL(request.url);
  const destination = new URL(PODCAST_ARTWORK_EDGE);
  destination.searchParams.set("type", "podcast-cover");
  destination.searchParams.set("slug", slug);
  if (portrait) destination.searchParams.set("layout", "4");
  else if (versioned) destination.searchParams.set("layout", "3");
  else if (incoming.searchParams.get("layout") === "2") destination.searchParams.set("layout", "2");
  const version = incoming.searchParams.get("v");
  if (version && /^\d{1,14}$/.test(version)) destination.searchParams.set("v", version);
  if (incoming.searchParams.get("download") === "1") destination.searchParams.set("download", "1");
  return new Response(null, { status: 307, headers: { Location: destination.href, "Cache-Control": "no-store" } });
}
