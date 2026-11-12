ALTER TABLE public.podcast_instagram_deliveries ADD COLUMN scheduled_at timestamptz;

CREATE INDEX podcast_instagram_schedule_pending
  ON public.podcast_instagram_deliveries (scheduled_at)
  WHERE status = 'pending' AND publish_attempted_at IS NULL AND scheduled_at IS NOT NULL;

CREATE FUNCTION public.schedule_podcast_instagram_delivery(p_episode_id text, p_local_time text)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  planned timestamptz;
  saved timestamptz;
BEGIN
  IF p_episode_id IS NULL OR p_episode_id !~ '^[A-Za-z0-9_-]{11}$'
    OR p_local_time IS NULL OR p_local_time !~ '^20[0-9]{2}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}$' THEN
    RETURN NULL;
  END IF;
  BEGIN
    planned := p_local_time::timestamp AT TIME ZONE 'America/Sao_Paulo';
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    RETURN NULL;
  END;
  IF planned <= now() OR NOT EXISTS (
    SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled AND instagram_enabled
  ) THEN RETURN NULL; END IF;
  UPDATE public.podcast_instagram_deliveries d
    SET scheduled_at = planned
  FROM public.podcast_episode_queue q
  WHERE d.youtube_id = p_episode_id AND q.youtube_id = d.youtube_id
    AND q.released_at IS NOT NULL AND q.prepared_instagram_post IS NOT NULL
    AND d.status = 'pending' AND d.publish_attempted_at IS NULL
    AND d.slot_at <= now() - interval '5 minutes'
    AND (d.lease_until IS NULL OR d.lease_until <= now())
  RETURNING d.scheduled_at INTO saved;
  RETURN saved;
END;
$$;

CREATE FUNCTION public.claim_scheduled_podcast_instagram()
RETURNS SETOF public.podcast_instagram_deliveries LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH next_delivery AS (
    SELECT d.youtube_id FROM public.podcast_instagram_deliveries d
    WHERE d.status = 'pending' AND d.publish_attempted_at IS NULL
      AND d.scheduled_at BETWEEN now() - interval '15 minutes' AND now()
      AND (d.lease_until IS NULL OR d.lease_until <= now())
      AND EXISTS (SELECT 1 FROM public.podcast_distribution_settings
        WHERE singleton AND feed_enabled AND scheduler_enabled AND instagram_enabled)
    ORDER BY d.scheduled_at, d.youtube_id
    LIMIT 1 FOR UPDATE OF d SKIP LOCKED
  )
  UPDATE public.podcast_instagram_deliveries d
  SET claim_token = gen_random_uuid(), lease_until = now() + interval '60 seconds'
  FROM next_delivery n WHERE d.youtube_id = n.youtube_id
  RETURNING d.*;
$$;
REVOKE ALL ON FUNCTION public.schedule_podcast_instagram_delivery(text, text),
  public.claim_scheduled_podcast_instagram() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.schedule_podcast_instagram_delivery(text, text),
  public.claim_scheduled_podcast_instagram() TO service_role;

CREATE FUNCTION public.dispatch_podcast_instagram_schedule()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  credentials public.podcast_worker_credentials;
  issued text;
  signature text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled AND instagram_enabled)
    OR NOT EXISTS (
      SELECT 1 FROM public.podcast_instagram_deliveries
      WHERE status = 'pending' AND publish_attempted_at IS NULL
        AND scheduled_at BETWEEN now() - interval '15 minutes' AND now()
        AND (lease_until IS NULL OR lease_until <= now())
    ) THEN RETURN NULL; END IF;
  SELECT * INTO credentials FROM public.podcast_worker_credentials WHERE singleton;
  IF credentials.actor_id IS NULL THEN RETURN NULL; END IF;
  issued := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
  signature := encode(extensions.hmac(convert_to(issued || ':podcast-tick','UTF8'),
    credentials.signing_key,'sha256'),'hex');
  RETURN net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
    headers := jsonb_build_object('Content-Type','application/json',
      'x-podcast-worker-signature',signature,'x-podcast-worker-issued-at',issued),
    body := jsonb_build_object('action','podcast-tick','instagramOnly',true),
    timeout_milliseconds := 120000
  );
END;
$$;
REVOKE ALL ON FUNCTION public.dispatch_podcast_instagram_schedule()
  FROM PUBLIC, anon, authenticated, service_role;

DO $cron$
BEGIN
  IF to_regclass('cron.job') IS NOT NULL AND EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'vitale-podcast-release'
  ) THEN
    PERFORM cron.schedule('vitale-podcast-instagram-schedule','* * * * *',
      'SELECT public.dispatch_podcast_instagram_schedule();');
  END IF;
END
$cron$;
