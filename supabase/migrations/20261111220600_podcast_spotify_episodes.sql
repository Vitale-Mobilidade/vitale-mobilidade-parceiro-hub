CREATE TABLE public.podcast_spotify_episodes (
  youtube_id text PRIMARY KEY REFERENCES public.podcast_episode_queue(youtube_id) ON DELETE CASCADE,
  spotify_episode_id text NOT NULL UNIQUE CHECK (spotify_episode_id ~ '^[A-Za-z0-9]{22}$')
);
ALTER TABLE public.podcast_spotify_episodes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podcast_spotify_episodes FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.podcast_spotify_episodes TO service_role;

-- First two matches verified against the Vitale show. Leave previews without matching rows empty.
INSERT INTO public.podcast_spotify_episodes (youtube_id, spotify_episode_id)
SELECT q.youtube_id, matches.spotify_episode_id
FROM (VALUES ('byk0-p8NedQ', '1IqFTdEUfqnh9PAuvndsFG'), ('qzaQ3G7PRl8', '324BQ31Y26a5askghi34ax'))
  matches(youtube_id, spotify_episode_id)
JOIN public.podcast_released_episodes q USING (youtube_id);

CREATE OR REPLACE VIEW public.podcast_released_episodes WITH (security_invoker = true) AS
SELECT q.youtube_id, q.title, q.original_description, q.released_at, q.object_path, q.size_bytes,
  spotify.spotify_episode_id
FROM public.podcast_episode_queue q
LEFT JOIN public.podcast_spotify_episodes spotify USING (youtube_id)
WHERE q.released_at <= now()
  AND EXISTS (SELECT 1 FROM public.podcast_distribution_settings s WHERE s.singleton AND s.feed_enabled);
