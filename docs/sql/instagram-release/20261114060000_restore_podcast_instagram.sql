-- REVIEW ONLY. Do not execute without owner approval and recoverable definition backup.
-- Definitions restored from 5ac2d34^ applied migrations; no new queue, data, cron or flags.
BEGIN;
CREATE OR REPLACE FUNCTION public.enqueue_podcast_instagram()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF OLD.released_at IS NULL
    AND NEW.release_at = public.podcast_release_slot(NEW.released_at)
    AND EXISTS (SELECT 1 FROM public.podcast_distribution_settings
      WHERE singleton AND feed_enabled AND scheduler_enabled AND instagram_enabled)
  THEN
    INSERT INTO public.podcast_instagram_deliveries (youtube_id, slot_at)
    VALUES (NEW.youtube_id, NEW.release_at)
    ON CONFLICT (youtube_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_podcast_instagram()
RETURNS SETOF public.podcast_instagram_deliveries LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.podcast_instagram_deliveries
  SET claim_token = gen_random_uuid(), lease_until = now() + interval '45 seconds'
  WHERE slot_at = public.podcast_release_slot(now()) AND status = 'pending' AND publish_attempted_at IS NULL
    AND error_code IS DISTINCT FROM 'meta_create_uncertain'
    AND (lease_until IS NULL OR lease_until <= now())
    AND EXISTS (SELECT 1 FROM public.podcast_distribution_settings
      WHERE singleton AND feed_enabled AND scheduler_enabled AND instagram_enabled)
  RETURNING *;
$$;

CREATE OR REPLACE FUNCTION public.schedule_podcast_instagram_delivery(p_episode_id text, p_local_time text)
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
    AND d.error_code IS DISTINCT FROM 'meta_create_uncertain'
    AND d.slot_at <= now() - interval '5 minutes'
    AND (d.lease_until IS NULL OR d.lease_until <= now())
  RETURNING d.scheduled_at INTO saved;
  RETURN saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_scheduled_podcast_instagram()
RETURNS SETOF public.podcast_instagram_deliveries LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  WITH next_delivery AS (
    SELECT d.youtube_id FROM public.podcast_instagram_deliveries d
    WHERE d.status = 'pending' AND d.publish_attempted_at IS NULL
      AND d.error_code IS DISTINCT FROM 'meta_create_uncertain'
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

CREATE OR REPLACE FUNCTION public.dispatch_podcast_instagram_schedule()
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
      AND error_code IS DISTINCT FROM 'meta_create_uncertain'
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

CREATE OR REPLACE VIEW public.podcast_prepared_episodes WITH(security_invoker=true) AS
SELECT q.youtube_id,q.title,v.published_on,q.source_folder_created_at,row_number() OVER (
 ORDER BY COALESCE(q.source_folder_created_at>history.last_release,false) DESC,
 CASE WHEN q.source_folder_created_at>history.last_release THEN q.source_folder_created_at END DESC NULLS LAST,
 v.published_on DESC NULLS LAST,q.source_folder_created_at DESC NULLS LAST,q.created_at DESC,q.youtube_id
) AS position
FROM public.podcast_episode_queue q JOIN public.editorial_videos v USING(youtube_id)
JOIN public.editorial_articles a ON a.video_id=v.youtube_id AND a.status='published' AND a.slug IS NOT NULL AND a.published_at<=now() AND a.updated_at=q.prepared_article_version
CROSS JOIN (SELECT max(released_at) AS last_release FROM public.podcast_episode_queue) history
WHERE q.released_at IS NULL AND q.release_at IS NULL AND v.status='active'
AND (q.prepared_cover_path IS NOT NULL OR q.prepared_instagram_post IS NOT NULL);

REVOKE ALL ON FUNCTION public.enqueue_podcast_instagram(), public.dispatch_podcast_instagram_schedule()
 FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.claim_podcast_instagram(), public.claim_scheduled_podcast_instagram(),
 public.schedule_podcast_instagram_delivery(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_podcast_instagram(), public.claim_scheduled_podcast_instagram(),
 public.schedule_podcast_instagram_delivery(text,text) TO service_role;
COMMIT;
