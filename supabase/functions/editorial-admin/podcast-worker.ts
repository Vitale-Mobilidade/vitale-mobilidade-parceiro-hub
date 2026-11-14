import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { notifyPodcastError } from "./podcast-alert.ts";
import { publishPodcastOnInstagram, verifyPodcastInstagramConnection } from "./podcast-instagram.ts";
import { fillPreparedPodcastQueue } from "./podcast-preparation.ts";
import { syncReleasedSpotifyEpisodes } from "./podcast-spotify.ts";

type Windows = { current: string | null; closed: string | null; near: string | null };

async function checkClosedWindow(db: SupabaseClient, slot: string) {
  const [episode, instagram] = await Promise.all([
    db.from("podcast_episode_queue").select("released_at").eq("release_at", slot).maybeSingle(),
    db.from("podcast_instagram_deliveries").select("status,error_code").eq("slot_at", slot).maybeSingle(),
  ]);
  if (episode.error || instagram.error) throw new Error("podcast_delivery_check_failed");
  if (!episode.data?.released_at) await notifyPodcastError(db, "RSS", slot, "podcast_slot_missed");
  if (instagram.data && instagram.data.status !== "published") {
    await notifyPodcastError(db, "Instagram", slot, instagram.data.error_code ?? "podcast_instagram_unconfirmed");
  }
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
    try {
      await publishPodcastOnInstagram(db);
    } catch (error) {
      await notifyPodcastError(db, "Instagram", windows.current, error);
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
  if (windows.near) {
    const settings = await db.from("podcast_distribution_settings").select("instagram_enabled")
      .eq("singleton", true).single();
    if (settings.error) await notifyPodcastError(db, "preparação", day, "podcast_distribution_settings_failed");
    if (settings.data?.instagram_enabled) {
      const result = await verifyPodcastInstagramConnection();
      if (result.status !== "verified") await notifyPodcastError(db, "Instagram", windows.near, result.status);
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
