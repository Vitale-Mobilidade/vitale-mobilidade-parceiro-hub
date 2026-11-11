import { inspectJpeg } from "./editorial-cover.ts";

type PodcastJpegCodec = {
  decode(bytes: Uint8Array, options: { useTArray: true; maxMemoryUsageInMB: number }): {
    width: number; height: number; data: Uint8Array;
  };
  encode(image: { data: Uint8Array; width: number; height: number }, quality: number): { data: Uint8Array };
};

const SIDE = 1400;
export const MAX_PODCAST_ART_BYTES = 4 * 1024 * 1024;

export function squarePodcastArtwork(bytes: Uint8Array, jpeg: PodcastJpegCodec): Uint8Array {
  const dimensions = inspectJpeg(bytes);
  if (!dimensions || bytes.length > MAX_PODCAST_ART_BYTES)
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

