import { afterEach, expect, it, vi } from "vitest";
import { prepareNextPodcastEpisode } from "../editorial-admin/podcast-queue";

afterEach(() => vi.unstubAllGlobals());

it("prepares the next attachment for the scheduler without WorkDrive credentials", async () => {
  const video = { youtube_id: "qzaQ3G7PRl8", title: "FT07", published_on: "2026-11-09" };
  const attachment = { youtube_id: video.youtube_id, object_path: "private/ft07.mp3", size_bytes: 23120427 };
  const readDescription = vi.fn().mockResolvedValue("Descrição original da FT07");
  const upsert = vi.fn().mockResolvedValue({ error: null });
  vi.stubGlobal("Deno", { env: { get: () => undefined } });
  const db = {
    from(table: string) {
      const rows = table === "podcast_video_audio" ? [attachment] : table === "podcast_episode_queue" ? [] : [video];
      const query = {
        select: () => query, eq: () => query, order: () => query,
        limit: async () => ({ data: rows }), single: async () => ({ data: rows[0] }),
        is: async () => ({ count: 0 }), upsert,
      };
      return query;
    },
  } as never;
  const actor = { id: "admin", role: "admin" };
  expect(await prepareNextPodcastEpisode(db, actor, readDescription)).toEqual({ status: "workdrive_unconfigured" });
  expect(upsert).not.toHaveBeenCalled();
  expect(await prepareNextPodcastEpisode(db, actor, readDescription, { useAttachedWithoutWorkDrive: true }))
    .toEqual({ status: "draft" });
  expect(upsert).toHaveBeenCalledWith({
    ...attachment, title: video.title, original_description: "Descrição original da FT07", source_folder_created_at: null,
  }, { onConflict: "youtube_id", ignoreDuplicates: true });
});
