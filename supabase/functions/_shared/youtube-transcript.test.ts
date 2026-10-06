import { describe, expect, it, vi } from "vitest";
import {
  captureYoutubeTranscript,
  parseCaptionVtt,
  VITALE_YOUTUBE_CHANNEL,
} from "./youtube-transcript";
const speech =
  "salve salve galera eu tô saindo hoje com essa bike e eu eu quero mostrar como ela anda na subida. ".repeat(
    3,
  );
const vtt = `WEBVTT\n\n00:00:00.000 --> 00:00:15.000\n${speech}\n\n00:00:15.000 --> 00:00:20.000\n<c>é isso galera &amp; bora</c>\n`;
function fakeFetch(channel = VITALE_YOUTUBE_CHANNEL, tracks?: unknown[]) {
  return vi
    .fn()
    .mockResolvedValueOnce(
      Response.json({ items: [{ snippet: { channelId: channel } }] }),
    )
    .mockResolvedValueOnce(
      Response.json({
        items: tracks ?? [
          {
            id: "asr-track",
            snippet: { language: "pt", trackKind: "ASR", status: "serving" },
          },
        ],
      }),
    )
    .mockResolvedValueOnce(new Response(vtt));
}
describe("original YouTube captions", () => {
  it("handles real ASR rolling lines, empty cues and spoken repetitions", () => {
    const first = speech.trim();
    const source = `WEBVTT\nKind: captions\nLanguage: pt\n\n00:00:00.000 --> 00:00:02.510 align:start\n \n${first}<00:00:01.000><c> bora bora</c>\n\n00:00:02.510 --> 00:00:02.520\n${first} bora bora\n \n\n00:00:02.520 --> 00:00:05.000\n${first} bora bora\neu<00:00:03.000><c> tô tô aqui</c>\n\n00:00:05.000 --> 00:00:06.000\n \n`;
    const result = parseCaptionVtt(source);
    expect(result.transcript).toBe(`${first} bora bora\neu tô tô aqui`);
    expect(result.cues).toHaveLength(3);
  });
  it("preserves colloquial speech and repetitions, storing all cues", () => {
    const result = parseCaptionVtt(vtt);
    expect(result.transcript).toContain(speech.trim());
    expect(result.transcript).toContain("é isso galera & bora");
    expect(result.cues).toHaveLength(2);
    expect(result.cues[1].endSeconds).toBe(20);
  });
  it("rejects HTML/error documents and incomplete cue syntax", () => {
    expect(() => parseCaptionVtt("<html>error</html>")).toThrow(
      "invalid_caption_format",
    );
    expect(() => parseCaptionVtt("WEBVTT\n\ngarbage")).toThrow(
      "invalid_caption_cue",
    );
    expect(() =>
      parseCaptionVtt("WEBVTT\n\n00:00:10.000 --> 00:00:01.000\nhello"),
    ).toThrow("invalid_caption_order");
  });
  it("rejects empty, insufficient and oversized sources instead of summarizing", () => {
    expect(() => parseCaptionVtt("WEBVTT\n\n")).toThrow("captions_empty");
    expect(() =>
      parseCaptionVtt("WEBVTT\n\n00:00:00.000 --> 00:00:01.000\nhello"),
    ).toThrow("captions_insufficient");
    expect(() =>
      parseCaptionVtt(vtt.replace(speech, "a".repeat(90001))),
    ).toThrow("transcript_too_long");
  });
  it("downloads ASR as VTT without translation or model calls", async () => {
    const fetcher = fakeFetch();
    const result = await captureYoutubeTranscript({
      videoId: "bEGnbVp6NZM",
      accessToken: "test-token",
      fetcher,
    });
    expect(result.originalVtt).toBe(vtt);
    expect(result.source).toBe("youtube_captions");
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls[2][0]).toBe(
      "https://www.googleapis.com/youtube/v3/captions/asr-track?tfmt=vtt",
    );
    expect(
      fetcher.mock.calls.every(
        ([url, options]) =>
          url.startsWith("https://www.googleapis.com/youtube/v3/") &&
          options.redirect === "error",
      ),
    ).toBe(true);
  });
  it("checks channel ownership before requesting captions", async () => {
    const fetcher = fakeFetch("another-channel");
    await expect(
      captureYoutubeTranscript({
        videoId: "bEGnbVp6NZM",
        accessToken: "test-token",
        fetcher,
      }),
    ).rejects.toThrow("video_outside_authorized_channel");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("waits when Portuguese captions are absent", async () => {
    const fetcher = fakeFetch(VITALE_YOUTUBE_CHANNEL, [
      { id: "english", snippet: { language: "en", status: "serving" } },
    ]);
    await expect(
      captureYoutubeTranscript({
        videoId: "bEGnbVp6NZM",
        accessToken: "test-token",
        fetcher,
      }),
    ).rejects.toMatchObject({
      code: "portuguese_captions_pending",
      retryable: true,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("prefers creator captions over ASR and rejects drafts", async () => {
    const fetcher = fakeFetch(VITALE_YOUTUBE_CHANNEL, [
      {
        id: "asr",
        snippet: { language: "pt", status: "serving", trackKind: "ASR" },
      },
      {
        id: "draft",
        snippet: { language: "pt", status: "serving", isDraft: true },
      },
      {
        id: "manual",
        snippet: {
          language: "pt-BR",
          status: "serving",
          trackKind: "standard",
        },
      },
    ]);
    await captureYoutubeTranscript({
      videoId: "bEGnbVp6NZM",
      accessToken: "test-token",
      fetcher,
    });
    expect(fetcher.mock.calls[2][0]).toContain("captions/manual?tfmt=vtt");
  });
  it("does not expose API error payloads or tokens", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response("private error details", { status: 403 }),
      );
    await expect(
      captureYoutubeTranscript({
        videoId: "bEGnbVp6NZM",
        accessToken: "test-token",
        fetcher,
      }),
    ).rejects.toThrow("youtube_http_403");
  });
  it("enforces download size even when content-length is absent", async () => {
    const fetcher = fakeFetch();
    fetcher
      .mockReset()
      .mockResolvedValueOnce(
        Response.json({
          items: [{ snippet: { channelId: VITALE_YOUTUBE_CHANNEL } }],
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          items: [
            { id: "asr", snippet: { language: "pt", status: "serving" } },
          ],
        }),
      )
      .mockResolvedValueOnce(new Response("a".repeat(2_000_001)));
    await expect(
      captureYoutubeTranscript({
        videoId: "bEGnbVp6NZM",
        accessToken: "test-token",
        fetcher,
      }),
    ).rejects.toThrow("captions_too_large");
  });
});
