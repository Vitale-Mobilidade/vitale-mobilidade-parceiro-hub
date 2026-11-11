CREATE FUNCTION public.podcast_release_slot(p_now timestamptz)
RETURNS timestamptz LANGUAGE sql STABLE STRICT SET search_path = '' AS $$
  SELECT (local_now::date + opens) AT TIME ZONE 'America/Sao_Paulo'
  FROM (SELECT p_now AT TIME ZONE 'America/Sao_Paulo' AS local_now) clock
  CROSS JOIN (VALUES (time '06:15'), (time '11:45'), (time '17:45')) AS slots(opens)
  WHERE local_now::time >= opens AND local_now::time < opens + interval '5 minutes';
$$;
REVOKE ALL ON FUNCTION public.podcast_release_slot(timestamptz) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dispatch_podcast_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  credentials public.podcast_worker_credentials;
  slot timestamptz;
  issued text;
  signature text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled) THEN RETURN NULL; END IF;
  slot := public.podcast_release_slot(now());
  IF slot IS NULL THEN RETURN NULL; END IF;
  IF EXISTS (SELECT 1 FROM public.podcast_episode_queue WHERE release_at = slot)
    THEN RETURN NULL; END IF;
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

CREATE OR REPLACE FUNCTION public.release_next_podcast_episode(p_now timestamptz DEFAULT now())
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  slot timestamptz;
  selected_id text;
BEGIN
  PERFORM pg_catalog.pg_advisory_xact_lock(142681064);
  IF NOT EXISTS (
    SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled
  ) THEN RETURN NULL; END IF;

  slot := public.podcast_release_slot(p_now);
  IF slot IS NULL THEN RETURN NULL; END IF;

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

-- Only update the existing job. Never enable scheduling in preview or a new environment.
DO $cron$
DECLARE job_id bigint;
BEGIN
  IF to_regclass('cron.job') IS NULL THEN RETURN; END IF;
  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'vitale-podcast-release';
  IF FOUND THEN PERFORM cron.alter_job(job_id, schedule := '15-19,45-49 * * * *'); END IF;
END
$cron$;
