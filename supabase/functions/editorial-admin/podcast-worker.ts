import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { notifyPodcastError } from "./podcast-alert.ts";
import { fillPreparedPodcastQueue } from "./podcast-preparation.ts";
import { syncReleasedSpotifyEpisodes } from "./podcast-spotify.ts";

type Windows = { current: string | null; closed: string | null; near: string | null };

async function checkClosedWindow(db: SupabaseClient, slot: string) {
  const episode = await db.from("podcast_episode_queue").select("released_at").eq("release_at", slot).maybeSingle();
  if (episode.error) throw new Error("podcast_delivery_check_failed");
  if (!episode.data?.released_at) await notifyPodcastError(db, "RSS", slot, "podcast_slot_missed");
}

export async function runPodcastTick(
  db: SupabaseClient, actor: { id: string; role: string }, readDescription: (id: string) => Promise<string>,
) {
  const day = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const { data: rawWindows, error } = await db.rpc("podcast_worker_windows");
  if (error || !rawWindows) {
    await notifyPodcastError(db, "preparação", day, "podcast_window_check_failed");
    throw new Error("podcast_window_check_failed");
  }
  const windows = rawWindows as Windows;
  if (windows.current) {
    let released: string | null;
    try {
      const result = await db.rpc("release_next_podcast_episode");
      if (result.error) throw new Error("podcast_release_failed");
      released = result.data;
    } catch (error) {
      await notifyPodcastError(db, "RSS", windows.current, error);
      throw error;
    }
    if (released) await syncReleasedSpotifyEpisodes(db).catch(() => console.warn("podcast_spotify_sync_unavailable"));
    return { status: released ? "released" : "checked" };
  }
  if (windows.closed) {
    try {
      await checkClosedWindow(db, windows.closed);
    } catch (error) {
      await notifyPodcastError(db, "RSS", windows.closed, error);
    }
  }
  try {
    const ready = await fillPreparedPodcastQueue(db, actor, readDescription, !!windows.near);
    if (windows.near && ready === 0) await notifyPodcastError(db, "preparação", windows.near, "podcast_queue_empty");
    return { status: "prepared", ready };
  } catch (error) {
    await notifyPodcastError(db, "preparação", day, error);
    throw error;
  }
}
