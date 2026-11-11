import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { matchSpotifyEpisodes, SPOTIFY_PODCAST } from "../_shared/podcast-spotify.ts";

export async function syncReleasedSpotifyEpisodes(db: SupabaseClient) {
  const { data, error } = await db.from("podcast_released_episodes")
    .select("youtube_id,title,spotify_episode_id").order("released_at", { ascending: false }).limit(500);
  if (error) throw error;
  if (!data?.some((episode) => !episode.spotify_episode_id)) return;
  const response = await fetch(SPOTIFY_PODCAST, { redirect: "error", signal: AbortSignal.timeout(2500) });
  if (!response.ok) throw new Error("spotify_catalog_unavailable");
  const rows = matchSpotifyEpisodes(await response.text(), data);
  for (const row of rows) {
    const { error: insertError } = await db.from("podcast_spotify_episodes")
      .upsert(row, { onConflict: "youtube_id", ignoreDuplicates: true });
    if (insertError) throw insertError;
  }
}
