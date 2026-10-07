import { fetchPublishedIndex } from "./editorial-repository.server";
import { fetchTrackerSplit } from "./radar-repository.server";
import { fetchVideoCatalog } from "./video-catalog.server";
import {
  NEWSLETTER_OPENINGS,
  renderResendNewsletter,
  type NewsletterContent,
} from "./newsletter";
import { createHash } from "node:crypto";

export async function automaticNewsletter(
  weekday: number,
): Promise<{ content: NewsletterContent; fingerprint: string }> {
  const [articles, radar, videos] = await Promise.all([
    fetchPublishedIndex(),
    fetchTrackerSplit(),
    fetchVideoCatalog(),
  ]);
  if (!articles?.length || !radar.ok || !videos.length)
    throw new Error("newsletter_sources_unavailable");
  const bikes = radar.data.active as { id: string; name: string }[];
  const bike = bikes.find(
    (b) =>
      typeof b.id === "string" &&
      /^[a-z0-9_]+$/.test(b.id) &&
      typeof b.name === "string",
  );
  if (!bike) throw new Error("newsletter_no_active_bike");
  const pickedArticles = [...articles]
    .sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""))
    .slice(0, 2);
  const pickedVideos = [...videos]
    .sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""))
    .slice(0, 2);
  const opening =
    weekday === 5 ? NEWSLETTER_OPENINGS.friday : NEWSLETTER_OPENINGS.monday;
  const content: NewsletterContent = {
    ...opening,
    articles: pickedArticles.map((a) => ({
      title: a.title,
      url: `https://vitalemobilidade.com/conteudos/${a.slug}`,
    })),
    bike: {
      title: bike.name,
      url: `https://vitalemobilidade.com/radar/${bike.id}`,
    },
    videos: pickedVideos.map((v) => ({ title: v.title, url: v.url })),
  };
  renderResendNewsletter(content); // Validation fails closed; don't send incomplete or unsafe content.
  const fingerprint = createHash("sha256")
    .update(JSON.stringify([content.articles, content.bike, content.videos]))
    .digest("hex");
  return { content, fingerprint };
}
