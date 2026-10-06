/** Queue policy only. Persistence must atomically implement the store contract before deployment. */
import {
  TranscriptError,
  type CapturedTranscript,
} from "./youtube-transcript.ts";
export type VideoQueueInput = {
  videoId: string;
  title: string;
  bikeIds: string[];
  unmatched: string[];
};
export type QueueJob = VideoQueueInput & {
  attempts: number;
  capture: CapturedTranscript | null;
};
export interface EditorialQueueStore {
  /** Single transaction: first successful complete snapshot creates only baseline rows; later unseen IDs enqueue. */
  ingestSnapshot(
    videos: VideoQueueInput[],
  ): Promise<{ baseline: boolean; queued: number }>;
  /** Atomic claim: one eligible job, no existing lease; generating jobs are never retried automatically. */
  claimNext(): Promise<QueueJob | null>;
  existingArticle(videoId: string): Promise<{ id: string } | null>;
  saveCapture(videoId: string, capture: CapturedTranscript): Promise<void>;
  /** Persist before invoking a paid writer; expired generating jobs require reconciliation/manual review. */
  markGenerating(videoId: string): Promise<void>;
  complete(videoId: string, articleId: string): Promise<void>;
  retry(videoId: string, code: string, delayMinutes: number): Promise<void>;
  review(videoId: string, code: string): Promise<void>;
}
export async function processYoutubeEditorialTick(input: {
  videos: VideoQueueInput[];
  store: EditorialQueueStore;
  capture: (videoId: string) => Promise<CapturedTranscript>;
  generateDraft: (
    video: VideoQueueInput,
    capture: CapturedTranscript,
  ) => Promise<{ id: string }>;
}): Promise<{ status: string; videoId?: string; queued?: number }> {
  // Caller must reject fetch/parser errors before calling this function. Empty snapshot never starts a baseline.
  if (!input.videos.length) throw new Error("empty_video_snapshot");
  if (
    input.videos.some(
      (v) =>
        !/^[A-Za-z0-9_-]{11}$/.test(v.videoId) || v.title.trim().length < 3,
    )
  )
    throw new Error("invalid_video_snapshot");
  const ingestion = await input.store.ingestSnapshot(input.videos);
  if (ingestion.baseline) return { status: "baseline_saved", queued: 0 };
  const job = await input.store.claimNext();
  if (!job) return { status: "idle", queued: ingestion.queued };
  const videoId = job.videoId;
  let generating = false;
  try {
    const existing = await input.store.existingArticle(videoId);
    if (existing) {
      await input.store.complete(videoId, existing.id);
      return { status: "already_exists", videoId };
    }
    if (job.unmatched.length || job.bikeIds.length > 7) {
      await input.store.review(videoId, "sheet_bikes_require_review");
      return { status: "needs_review", videoId };
    }
    const capture = job.capture ?? (await input.capture(videoId));
    if (
      capture.videoId !== videoId ||
      capture.source !== "youtube_captions" ||
      capture.transcript.length < 200
    )
      throw new Error("invalid_transcript_source");
    await input.store.saveCapture(videoId, capture);
    // Reconcile again after network I/O, before any generation cost.
    const afterCapture = await input.store.existingArticle(videoId);
    if (afterCapture) {
      await input.store.complete(videoId, afterCapture.id);
      return { status: "already_exists", videoId };
    }
    await input.store.markGenerating(videoId);
    generating = true;
    const article = await input.generateDraft(job, capture);
    if (!article.id) throw new Error("missing_generated_article");
    await input.store.complete(videoId, article.id);
    return { status: "draft_created", videoId };
  } catch (error) {
    if (
      !generating &&
      error instanceof TranscriptError &&
      error.retryable &&
      job.attempts < 24
    ) {
      await input.store.retry(
        videoId,
        error.code,
        Math.min(360, 60 * 2 ** Math.min(job.attempts, 3)),
      );
      return { status: "waiting_for_transcript", videoId };
    }
    // No provider error text or tokens in queue records; uncertain paid generation is never replayed.
    await input.store.review(
      videoId,
      generating
        ? "generation_result_requires_reconciliation"
        : error instanceof TranscriptError
          ? error.code
          : "capture_or_persistence_failed",
    );
    return { status: "needs_review", videoId };
  }
}
