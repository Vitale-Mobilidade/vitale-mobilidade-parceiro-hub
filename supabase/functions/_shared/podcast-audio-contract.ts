export const PODCAST_AUDIO_BUCKET = "podcast-audio";
export const PODCAST_AUDIO_MAX_BYTES = 50 * 1024 * 1024;

export function validPodcastAudioName(name: string): boolean {
  return (
    name.length >= 5 &&
    name.length <= 180 &&
    /\.mp3$/i.test(name) &&
    !name.includes("/") &&
    !name.includes("\\") &&
    !Array.from(name).some(
      (char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127,
    )
  );
}

export function validPodcastAudioSize(size: unknown): size is number {
  return (
    typeof size === "number" &&
    Number.isSafeInteger(size) &&
    size >= 4 &&
    size <= PODCAST_AUDIO_MAX_BYTES
  );
}

export async function hasMp3Signature(
  size: number,
  read: (start: number, length: number) => Promise<Uint8Array>,
): Promise<boolean> {
  if (!validPodcastAudioSize(size)) return false;
  let bytes = await read(0, Math.min(size, 10));
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    if (
      bytes.length < 10 ||
      bytes[3] < 2 ||
      bytes[3] > 4 ||
      bytes.subarray(6, 10).some((byte) => byte >= 128)
    )
      return false;
    let offset = 10;
    for (let i = 6; i <= 9; i++) offset += bytes[i] * 128 ** (9 - i);
    if (bytes[3] === 4 && bytes[5] & 0x10) offset += 10;
    if (offset + 4 > size) return false;
    bytes = await read(offset, 4);
  }
  return (
    bytes.length >= 4 &&
    bytes[0] === 0xff &&
    (bytes[1] & 0xe0) === 0xe0 &&
    (bytes[1] & 0x18) !== 0x08 &&
    (bytes[1] & 0x06) === 0x02 &&
    (bytes[2] & 0xf0) !== 0xf0 &&
    (bytes[2] & 0x0c) !== 0x0c
  );
}
