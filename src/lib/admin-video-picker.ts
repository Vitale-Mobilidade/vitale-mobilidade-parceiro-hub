import { parseYoutubeId, type VideoItem } from "./video-catalog";

function normalized(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function filterAdminVideos(
  videos: VideoItem[],
  query: string,
): VideoItem[] {
  const term = normalized(query);
  if (!term) return videos;
  return videos.filter((video) =>
    normalized(`${video.title} ${video.videoId}`).includes(term),
  );
}

export function manualAdminVideo(url: string, title: string): VideoItem | null {
  const videoId = parseYoutubeId(url);
  const cleanTitle = title.trim().replace(/\s+/g, " ");
  if (!videoId || cleanTitle.length < 3) return null;
  return {
    videoId,
    title: cleanTitle,
    date: null,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    bikeIds: [],
    unmatched: [],
  };
}
