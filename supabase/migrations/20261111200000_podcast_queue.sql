CREATE TABLE public.podcast_distribution_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  feed_enabled boolean NOT NULL DEFAULT false,
  scheduler_enabled boolean NOT NULL DEFAULT false,
  verification_email text
);
INSERT INTO public.podcast_distribution_settings DEFAULT VALUES;

CREATE TABLE public.podcast_episode_queue (
  youtube_id text PRIMARY KEY REFERENCES public.podcast_video_audio(youtube_id),
  title text NOT NULL,
  object_path text NOT NULL,
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 4 AND 52428800),
  original_description text NOT NULL CHECK (length(trim(original_description)) > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  source_folder_created_at timestamptz,
  release_at timestamptz UNIQUE,
  released_at timestamptz,
  CHECK (released_at IS NULL OR (release_at IS NOT NULL AND released_at >= release_at))
);

ALTER TABLE public.podcast_distribution_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.podcast_episode_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podcast_distribution_settings, public.podcast_episode_queue FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.podcast_distribution_settings TO service_role;
GRANT SELECT, INSERT ON public.podcast_episode_queue TO service_role;

CREATE VIEW public.podcast_queue_candidates WITH (security_invoker = true) AS
SELECT v.youtube_id, v.title, v.published_on, a.uploaded_at
FROM public.editorial_videos v
JOIN public.podcast_video_audio a USING (youtube_id)
WHERE v.status = 'active'
  AND NOT EXISTS (SELECT 1 FROM public.podcast_episode_queue q WHERE q.youtube_id = v.youtube_id);
REVOKE ALL ON public.podcast_queue_candidates FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.podcast_queue_candidates TO service_role;

CREATE VIEW public.podcast_released_episodes WITH (security_invoker = true) AS
SELECT q.youtube_id, q.title, q.original_description, q.released_at, q.object_path, q.size_bytes
FROM public.podcast_episode_queue q
WHERE q.released_at <= now()
  AND EXISTS (SELECT 1 FROM public.podcast_distribution_settings s WHERE s.singleton AND s.feed_enabled);
REVOKE ALL ON public.podcast_released_episodes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.podcast_released_episodes TO service_role;

CREATE FUNCTION public.release_next_podcast_episode(p_now timestamptz DEFAULT now())
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  local_now timestamp := p_now AT TIME ZONE 'America/Sao_Paulo';
  local_time time := local_now::time;
  slot timestamptz;
  selected_id text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(142681064);
  IF NOT EXISTS (
    SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled
  ) THEN RETURN NULL; END IF;

  IF local_time >= time '11:45' AND local_time < time '11:50' THEN
    slot := (local_now::date + time '11:45') AT TIME ZONE 'America/Sao_Paulo';
  ELSIF local_time >= time '17:45' AND local_time < time '17:50' THEN
    slot := (local_now::date + time '17:45') AT TIME ZONE 'America/Sao_Paulo';
  ELSE RETURN NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM public.podcast_episode_queue WHERE release_at = slot)
    THEN RETURN NULL; END IF;

  SELECT q.youtube_id INTO selected_id
  FROM public.podcast_episode_queue q
  JOIN public.editorial_videos v USING (youtube_id)
  WHERE q.released_at IS NULL AND q.release_at IS NULL AND v.status = 'active'
  ORDER BY
    COALESCE(q.source_folder_created_at > (SELECT max(released_at) FROM public.podcast_episode_queue), false) DESC,
    CASE WHEN q.source_folder_created_at > (SELECT max(released_at) FROM public.podcast_episode_queue)
      THEN q.source_folder_created_at END DESC NULLS LAST,
    v.published_on DESC NULLS LAST, q.source_folder_created_at DESC NULLS LAST, q.created_at DESC, q.youtube_id
  LIMIT 1 FOR UPDATE OF q;

  IF selected_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.podcast_episode_queue SET release_at = slot, released_at = p_now
  WHERE youtube_id = selected_id;
  RETURN selected_id;
END;
$$;
REVOKE ALL ON FUNCTION public.release_next_podcast_episode(timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_next_podcast_episode(timestamptz) TO service_role;
