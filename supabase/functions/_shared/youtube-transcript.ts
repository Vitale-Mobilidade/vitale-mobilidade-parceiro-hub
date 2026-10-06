/** Server-only adapter. Downloads existing captions; never calls a language model. */
export const VITALE_YOUTUBE_CHANNEL = "UC9LuObKw8ZLoQBk6qHydEeg";
const API = "https://www.googleapis.com/youtube/v3";
const MAX_BYTES = 2_000_000;
export class TranscriptError extends Error {
  code: string;
  retryable: boolean;
  constructor(code: string, retryable = false) {
    super(code);
    this.code = code;
    this.retryable = retryable;
  }
}
export type CaptionCue = {
  startSeconds: number;
  endSeconds: number;
  text: string;
};
export type CapturedTranscript = {
  videoId: string;
  channelId: string;
  trackId: string;
  language: string;
  trackKind: string;
  source: "youtube_captions";
  capturedAt: string;
  originalVtt: string;
  transcript: string;
  cues: CaptionCue[];
};
function timestamp(value: string): number {
  if (!/^(?:\d{2,}:)?\d{2}:\d{2}\.\d{3}$/.test(value))
    throw new TranscriptError("invalid_caption_timestamp");
  const parts = value.split(":").map(Number);
  if (parts.at(-1)! >= 60 || parts.at(-2)! >= 60)
    throw new TranscriptError("invalid_caption_timestamp");
  return parts.reduce((total, part) => total * 60 + part, 0);
}
function plainCaption(value: string): string {
  // Strip only WebVTT cue markup. Preserve word order, repetitions and colloquial speech.
  const stripped = value
    .replace(/<\/?(?:c(?:\.[^ >]+)*|v|lang|b|i|u|ruby|rt)(?:\s[^>]*)?>/g, "")
    .replace(/<\d{2}:\d{2}:\d{2}\.\d{3}>/g, "");
  if (/<[^>]*>/.test(stripped))
    throw new TranscriptError("unsupported_caption_markup");
  return stripped
    .replace(
      /&(?:amp|lt|gt|nbsp|lrm|rlm);/g,
      (entity) =>
        ({
          "&amp;": "&",
          "&lt;": "<",
          "&gt;": ">",
          "&nbsp;": " ",
          "&lrm;": "\u200e",
          "&rlm;": "\u200f",
        })[entity]!,
    )
    .trim();
}
export function parseCaptionVtt(original: string): {
  transcript: string;
  cues: CaptionCue[];
} {
  if (new TextEncoder().encode(original).length > MAX_BYTES)
    throw new TranscriptError("captions_too_large");
  const normalized = original.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!/^WEBVTT(?:[ \t].*)?\n/.test(normalized))
    throw new TranscriptError("invalid_caption_format");
  const cues: CaptionCue[] = [];
  const spoken: string[] = [];
  for (const block of normalized.split(/\n\n+/).slice(1)) {
    if (!block.trim() || /^(NOTE|STYLE|REGION)(?:\s|$)/.test(block)) continue;
    const lines = block.trim().split("\n");
    const index = lines[0].includes("-->") ? 0 : 1;
    const timing = lines[index]?.match(/^(\S+)\s+-->\s+(\S+)(?:\s+.*)?$/);
    if (!timing) throw new TranscriptError("invalid_caption_cue");
    const startSeconds = timestamp(timing[1]),
      endSeconds = timestamp(timing[2]);
    if (
      endSeconds <= startSeconds ||
      (cues.length && startSeconds < cues.at(-1)!.startSeconds)
    )
      throw new TranscriptError("invalid_caption_order");
    const rawText = lines.slice(index + 1).join("\n");
    const text = plainCaption(rawText);
    if (!text) continue; // YouTube emits empty timing cues during silence.
    const previous = cues.at(-1);
    const adjacent = previous && startSeconds <= previous.endSeconds + 0.05;
    // ASR repeats the previous screen line before timestamped new words.
    // Remove only that display line; repeated words within spoken text stay intact.
    let addition = text;
    if (adjacent && /<\d{2}:\d{2}:\d{2}\.\d{3}>/.test(rawText)) {
      const visibleLines = text
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (
        visibleLines.length > 1 &&
        visibleLines[0] === previous.text.split("\n").at(-1)?.trim()
      )
        addition = visibleLines.slice(1).join("\n");
    } else if (
      adjacent &&
      endSeconds - startSeconds <= 0.025 &&
      previous.text.endsWith(text)
    ) {
      addition = ""; // YouTube's 10 ms stabilization cue, not another spoken sentence.
    }
    if (addition) spoken.push(addition);
    cues.push({ startSeconds, endSeconds, text });
  }
  if (!cues.length) throw new TranscriptError("captions_empty", true);
  // No semantic editing: original source and every nonempty cue remain auditable.
  const transcript = spoken.join("\n");
  if (transcript.length < 200)
    throw new TranscriptError("captions_insufficient", true);
  if (transcript.length > 90000)
    throw new TranscriptError("transcript_too_long_for_full_source_analysis");
  return { transcript, cues };
}
async function get(
  fetcher: typeof fetch,
  url: string,
  token: string,
): Promise<Response> {
  const response = await fetcher(url, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000),
    redirect: "error",
  });
  if (!response.ok)
    throw new TranscriptError(
      `youtube_http_${response.status}`,
      response.status === 429 || response.status >= 500,
    );
  return response;
}
async function readCaptionBody(response: Response): Promise<string> {
  if (!response.body) throw new TranscriptError("captions_empty", true);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      bytes += part.value.byteLength;
      if (bytes > MAX_BYTES) {
        await reader.cancel();
        throw new TranscriptError("captions_too_large");
      }
      text += decoder.decode(part.value, { stream: true });
    }
    return text + decoder.decode();
  } finally {
    reader.releaseLock();
  }
}
export async function captureYoutubeTranscript(input: {
  videoId: string;
  accessToken: string;
  fetcher?: typeof fetch;
  now?: () => Date;
}): Promise<CapturedTranscript> {
  if (!/^[A-Za-z0-9_-]{11}$/.test(input.videoId))
    throw new TranscriptError("invalid_video_id");
  if (!input.accessToken)
    throw new TranscriptError("youtube_authorization_required");
  const fetcher = input.fetcher ?? fetch;
  const videoResponse = await get(
    fetcher,
    `${API}/videos?part=snippet&id=${input.videoId}`,
    input.accessToken,
  );
  const videos = await videoResponse.json();
  const channelId = videos.items?.[0]?.snippet?.channelId;
  if (!channelId) throw new TranscriptError("video_not_available", true);
  if (channelId !== VITALE_YOUTUBE_CHANNEL)
    throw new TranscriptError("video_outside_authorized_channel");
  const listResponse = await get(
    fetcher,
    `${API}/captions?part=snippet&videoId=${input.videoId}`,
    input.accessToken,
  );
  const tracks = await listResponse.json();
  if (!Array.isArray(tracks.items))
    throw new TranscriptError("invalid_caption_list");
  const candidates = tracks.items.filter(
    (track: {
      id?: string;
      snippet?: { language?: string; status?: string; isDraft?: boolean };
    }) =>
      track.id &&
      /^pt(?:-|$)/i.test(track.snippet?.language ?? "") &&
      track.snippet?.status === "serving" &&
      !track.snippet?.isDraft,
  );
  // Prefer creator-provided Portuguese over ASR, preserving original language in both cases.
  candidates.sort(
    (
      a: { snippet: { trackKind?: string } },
      b: { snippet: { trackKind?: string } },
    ) =>
      Number(a.snippet.trackKind?.toLowerCase() === "asr") -
      Number(b.snippet.trackKind?.toLowerCase() === "asr"),
  );
  const track = candidates[0];
  if (!track) throw new TranscriptError("portuguese_captions_pending", true);
  const response = await get(
    fetcher,
    `${API}/captions/${encodeURIComponent(track.id)}?tfmt=vtt`,
    input.accessToken,
  );
  if (Number(response.headers.get("content-length") ?? 0) > MAX_BYTES)
    throw new TranscriptError("captions_too_large");
  const originalVtt = await readCaptionBody(response);
  const parsed = parseCaptionVtt(originalVtt);
  return {
    videoId: input.videoId,
    channelId,
    trackId: track.id,
    language: track.snippet.language,
    trackKind: track.snippet.trackKind ?? "standard",
    source: "youtube_captions",
    capturedAt: (input.now ?? (() => new Date()))().toISOString(),
    originalVtt,
    ...parsed,
  };
}
