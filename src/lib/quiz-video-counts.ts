import type { VideoItem } from "./video-catalog";

/** Exact canonical associations, one count per distinct YouTube video. */
export function countBikeVideos(videos: VideoItem[]): Record<string, number> {
  const ids = new Map<string, Set<string>>();
  for (const video of videos) {
    for (const bikeId of video.bikeIds) {
      const set = ids.get(bikeId) ?? new Set<string>();
      set.add(video.videoId);
      ids.set(bikeId, set);
    }
  }
  return Object.fromEntries([...ids].map(([id, videos]) => [id, videos.size]));
}
