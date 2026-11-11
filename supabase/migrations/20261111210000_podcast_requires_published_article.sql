CREATE VIEW public.podcast_article_ready_videos WITH (security_invoker = true) AS
SELECT v.youtube_id, v.title, v.published_on
FROM public.editorial_videos v
WHERE v.status = 'active'
  AND EXISTS (
    SELECT 1 FROM public.editorial_articles a
    WHERE a.video_id = v.youtube_id AND a.status = 'published'
      AND a.slug IS NOT NULL AND a.published_at <= now()
  );
REVOKE ALL ON public.podcast_article_ready_videos FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.podcast_article_ready_videos TO service_role;

CREATE OR REPLACE VIEW public.podcast_queue_candidates WITH (security_invoker = true) AS
SELECT v.youtube_id, v.title, v.published_on, a.uploaded_at
FROM public.podcast_article_ready_videos v
JOIN public.podcast_video_audio a USING (youtube_id)
WHERE NOT EXISTS (SELECT 1 FROM public.podcast_episode_queue q WHERE q.youtube_id = v.youtube_id);

CREATE OR REPLACE FUNCTION public.release_next_podcast_episode(p_now timestamptz DEFAULT now())
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
  JOIN public.editorial_articles a ON a.video_id = v.youtube_id
    AND a.status = 'published' AND a.slug IS NOT NULL AND a.published_at <= p_now
  WHERE q.released_at IS NULL AND q.release_at IS NULL AND v.status = 'active'
  ORDER BY
    COALESCE(q.source_folder_created_at > (SELECT max(released_at) FROM public.podcast_episode_queue), false) DESC,
    CASE WHEN q.source_folder_created_at > (SELECT max(released_at) FROM public.podcast_episode_queue)
      THEN q.source_folder_created_at END DESC NULLS LAST,
    v.published_on DESC NULLS LAST, q.source_folder_created_at DESC NULLS LAST, q.created_at DESC, q.youtube_id
  LIMIT 1 FOR UPDATE OF q FOR SHARE OF a;

  IF selected_id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.podcast_episode_queue SET release_at = slot, released_at = p_now
  WHERE youtube_id = selected_id;
  RETURN selected_id;
END;
$$;
