import { describe, it, expect, vi } from "vitest";
import {
  processYoutubeEditorialTick,
  type EditorialQueueStore,
  type QueueJob,
} from "./youtube-editorial-queue";
import { TranscriptError, type CapturedTranscript } from "./youtube-transcript";
const video = {
  videoId: "Xn8ZUQn_HGk",
  title: "V9 Max por menos de seis mil",
  bikeIds: ["v9_max"],
  unmatched: [],
};
const source = {
  videoId: video.videoId,
  source: "youtube_captions",
  transcript: "salve salve galera ".repeat(30),
} as CapturedTranscript;
function setup(baseline = false) {
  const store: EditorialQueueStore = {
    ingestSnapshot: vi.fn().mockResolvedValue({ baseline, queued: 1 }),
    claimNext: vi
      .fn()
      .mockResolvedValue({ ...video, attempts: 0, capture: null } as QueueJob),
    existingArticle: vi.fn().mockResolvedValue(null),
    saveCapture: vi.fn(),
    markGenerating: vi.fn(),
    complete: vi.fn(),
    retry: vi.fn(),
    review: vi.fn(),
  };
  return {
    videos: [video],
    store,
    capture: vi.fn().mockResolvedValue(source),
    generateDraft: vi.fn().mockResolvedValue({ id: "article-id" }),
  };
}
describe("YouTube editorial queue policy", () => {
  it("baselines the existing snapshot without capture or generation", async () => {
    const input = setup(true);
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "baseline_saved",
    );
    expect(input.store.claimNext).not.toHaveBeenCalled();
    expect(input.generateDraft).not.toHaveBeenCalled();
  });
  it("rejects an empty snapshot before changing baseline", async () => {
    const input = setup();
    input.videos = [];
    await expect(processYoutubeEditorialTick(input)).rejects.toThrow(
      "empty_video_snapshot",
    );
    expect(input.store.ingestSnapshot).not.toHaveBeenCalled();
  });
  it("does not regenerate a video with an article", async () => {
    const input = setup();
    vi.mocked(input.store.existingArticle).mockResolvedValue({
      id: "existing",
    });
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "already_exists",
    );
    expect(input.capture).not.toHaveBeenCalled();
    expect(input.generateDraft).not.toHaveBeenCalled();
  });
  it("waits for captions without a model fallback", async () => {
    const input = setup();
    input.capture.mockRejectedValue(
      new TranscriptError("portuguese_captions_pending", true),
    );
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "waiting_for_transcript",
    );
    expect(input.generateDraft).not.toHaveBeenCalled();
    expect(input.store.retry).toHaveBeenCalledWith(
      video.videoId,
      "portuguese_captions_pending",
      60,
    );
  });
  it("preserves sheet associations and source in the existing writer callback", async () => {
    const input = setup();
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "draft_created",
    );
    expect(input.generateDraft).toHaveBeenCalledWith(
      expect.objectContaining({ title: video.title, bikeIds: video.bikeIds }),
      source,
    );
    expect(input.store.markGenerating).toHaveBeenCalled();
    expect(input.store.complete).toHaveBeenCalledWith(
      video.videoId,
      "article-id",
    );
  });
  it("blocks unrecognized bike names", async () => {
    const input = setup();
    vi.mocked(input.store.claimNext).mockResolvedValue({
      ...video,
      unmatched: ["GT20"],
      attempts: 0,
      capture: null,
    });
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "needs_review",
    );
    expect(input.generateDraft).not.toHaveBeenCalled();
  });
  it("does not repeat paid generation when its outcome is uncertain", async () => {
    const input = setup();
    input.generateDraft.mockRejectedValue(
      new Error("provider timeout private details"),
    );
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "needs_review",
    );
    expect(input.store.retry).not.toHaveBeenCalled();
    expect(input.store.review).toHaveBeenCalledWith(
      video.videoId,
      "generation_result_requires_reconciliation",
    );
  });
  it("reconciles an article created while capturing", async () => {
    const input = setup();
    vi.mocked(input.store.existingArticle)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "manual-article" });
    expect((await processYoutubeEditorialTick(input)).status).toBe(
      "already_exists",
    );
    expect(input.generateDraft).not.toHaveBeenCalled();
  });
});
