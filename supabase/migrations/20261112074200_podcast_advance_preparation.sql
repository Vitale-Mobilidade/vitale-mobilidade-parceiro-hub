ALTER TABLE public.podcast_episode_queue
  ADD COLUMN prepared_article_version timestamptz,
  ADD COLUMN prepared_instagram_post jsonb,
  ADD COLUMN preparation_attempted_at timestamptz;
GRANT UPDATE (prepared_article_version, prepared_instagram_post, preparation_attempted_at)
  ON public.podcast_episode_queue TO service_role;

CREATE VIEW public.podcast_prepared_episodes WITH (security_invoker = true) AS
SELECT q.youtube_id, q.title, v.published_on, q.source_folder_created_at, row_number() OVER (
  ORDER BY COALESCE(q.source_folder_created_at > history.last_release, false) DESC,
    CASE WHEN q.source_folder_created_at > history.last_release THEN q.source_folder_created_at END DESC NULLS LAST,
    v.published_on DESC NULLS LAST, q.source_folder_created_at DESC NULLS LAST, q.created_at DESC, q.youtube_id
) AS position
FROM public.podcast_episode_queue q
JOIN public.editorial_videos v USING (youtube_id)
JOIN public.editorial_articles a ON a.video_id = v.youtube_id
  AND a.status = 'published' AND a.slug IS NOT NULL AND a.published_at <= now()
  AND a.updated_at = q.prepared_article_version
CROSS JOIN (SELECT max(released_at) AS last_release FROM public.podcast_episode_queue) history
WHERE q.released_at IS NULL AND q.release_at IS NULL AND v.status = 'active'
  AND q.prepared_instagram_post IS NOT NULL;
REVOKE ALL ON public.podcast_prepared_episodes FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.podcast_prepared_episodes TO service_role;

CREATE VIEW public.podcast_pending_preparation WITH (security_invoker = true) AS
SELECT q.youtube_id, q.title, q.preparation_attempted_at, q.created_at
FROM public.podcast_episode_queue q
JOIN public.podcast_article_ready_videos a USING (youtube_id)
WHERE q.released_at IS NULL AND q.release_at IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.podcast_prepared_episodes p WHERE p.youtube_id = q.youtube_id);
REVOKE ALL ON public.podcast_pending_preparation FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.podcast_pending_preparation TO service_role;

CREATE FUNCTION public.podcast_upcoming_windows()
RETURNS SETOF timestamptz LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT instant FROM generate_series(0, 3) AS days(day_offset)
  CROSS JOIN (VALUES (time '06:15'), (time '11:45'), (time '17:45')) AS times(opens)
  CROSS JOIN LATERAL (
    SELECT (((now() AT TIME ZONE 'America/Sao_Paulo')::date + days.day_offset) + times.opens)
      AT TIME ZONE 'America/Sao_Paulo' AS instant
  ) AS windows
  WHERE instant > now() - interval '5 minutes'
    AND NOT EXISTS (SELECT 1 FROM public.podcast_episode_queue WHERE release_at = instant)
  ORDER BY instant LIMIT 6;
$$;
REVOKE ALL ON FUNCTION public.podcast_upcoming_windows() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.podcast_upcoming_windows() TO service_role;

CREATE FUNCTION public.podcast_worker_windows()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT jsonb_build_object(
    'current', public.podcast_release_slot(now()),
    'closed', public.podcast_release_slot(now() - interval '7 minutes'),
    'near', coalesce(public.podcast_release_slot(now() + interval '5 minutes'),
      public.podcast_release_slot(now() + interval '15 minutes')));
$$;
REVOKE ALL ON FUNCTION public.podcast_worker_windows() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.podcast_worker_windows() TO service_role;

CREATE OR REPLACE FUNCTION public.release_next_podcast_episode(p_now timestamptz DEFAULT now())
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  slot timestamptz;
  selected_id text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(142681064);
  IF NOT EXISTS (SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled) THEN RETURN NULL; END IF;
  slot := public.podcast_release_slot(p_now);
  IF slot IS NULL OR EXISTS (SELECT 1 FROM public.podcast_episode_queue WHERE release_at = slot)
    THEN RETURN NULL; END IF;

  SELECT q.youtube_id INTO selected_id
  FROM public.podcast_prepared_episodes prepared
  JOIN public.podcast_episode_queue q USING (youtube_id)
  JOIN public.editorial_articles a ON a.video_id = q.youtube_id
    AND a.status = 'published' AND a.published_at <= p_now AND a.updated_at = q.prepared_article_version
  WHERE q.released_at IS NULL AND q.release_at IS NULL
  ORDER BY prepared.position
  LIMIT 1 FOR UPDATE OF q FOR SHARE OF a;
  IF selected_id IS NULL THEN RETURN NULL; END IF;

  UPDATE public.podcast_episode_queue SET release_at = slot, released_at = p_now WHERE youtube_id = selected_id;
  RETURN selected_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.dispatch_podcast_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  credentials public.podcast_worker_credentials;
  slot timestamptz := public.podcast_release_slot(now());
  issued text;
  signature text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled) THEN RETURN NULL; END IF;
  IF slot IS NULL AND public.podcast_release_slot(now() - interval '7 minutes') IS NULL THEN
    IF extract(minute FROM now() AT TIME ZONE 'America/Sao_Paulo') NOT IN (0, 10, 30, 40)
      THEN RETURN NULL; END IF;
    IF public.podcast_release_slot(now() + interval '5 minutes') IS NULL
      AND public.podcast_release_slot(now() + interval '15 minutes') IS NULL
      AND (SELECT count(*) FROM public.podcast_prepared_episodes) >= 6 THEN RETURN NULL; END IF;
  END IF;
  IF slot IS NOT NULL AND EXISTS (SELECT 1 FROM public.podcast_episode_queue WHERE release_at = slot)
    AND NOT EXISTS (
      SELECT 1 FROM public.podcast_instagram_deliveries d
      JOIN public.podcast_distribution_settings s ON s.singleton AND s.instagram_enabled
      WHERE d.slot_at = slot AND d.status = 'pending' AND (d.lease_until IS NULL OR d.lease_until <= now())
    ) THEN RETURN NULL;
  END IF;
  SELECT * INTO credentials FROM public.podcast_worker_credentials WHERE singleton;
  IF credentials.actor_id IS NULL THEN RETURN NULL; END IF;
  issued := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
  signature := encode(extensions.hmac(convert_to(issued || ':podcast-tick','UTF8'),
    credentials.signing_key,'sha256'),'hex');
  RETURN net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-podcast-worker-signature',signature,'x-podcast-worker-issued-at',issued),
    body := jsonb_build_object('action','podcast-tick'),
    timeout_milliseconds := 120000
  );
END;
$$;

-- Only change the schedule of the existing job.
DO $cron$
DECLARE job_id bigint;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN RETURN; END IF;
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'vitale-podcast-release';
  IF FOUND THEN PERFORM cron.alter_job(job_id, schedule := '0,10,15-19,22,30,40,45-49,52 * * * *'); END IF;
END
$cron$;
