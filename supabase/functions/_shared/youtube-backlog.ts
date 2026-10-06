import type { VideoItem } from "./video-catalog.ts";
export function independentVideoQueue(videos: VideoItem[], articles: { video_id: string; title: string }[], storedVideos: { youtube_id: string; title: string }[]) {
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const ids = new Set(articles.map(article => article.video_id));
  const titles = new Set(articles.map(article => normalize(article.title)));
  for (const video of storedVideos) if (ids.has(video.youtube_id)) titles.add(normalize(video.title));
  return videos.filter(video => !ids.has(video.videoId) && !titles.has(normalize(video.title)));
}
