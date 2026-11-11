ALTER TABLE public.podcast_distribution_settings
  ADD COLUMN instagram_enabled boolean NOT NULL DEFAULT false;

CREATE TABLE public.podcast_instagram_deliveries (
  youtube_id text PRIMARY KEY REFERENCES public.podcast_episode_queue(youtube_id),
  slot_at timestamptz NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'published', 'failed')),
  claim_token uuid,
  lease_until timestamptz,
  container_id text CHECK (container_id ~ '^[0-9]{1,30}$'),
  publish_attempted_at timestamptz,
  published_at timestamptz,
  permalink text,
  error_code text,
  CHECK (status <> 'published' OR published_at IS NOT NULL)
);
ALTER TABLE public.podcast_instagram_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podcast_instagram_deliveries FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.podcast_instagram_deliveries TO service_role;

CREATE FUNCTION public.enqueue_podcast_instagram()
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
REVOKE ALL ON FUNCTION public.enqueue_podcast_instagram() FROM PUBLIC, anon, authenticated, service_role;
CREATE TRIGGER enqueue_podcast_instagram
AFTER UPDATE OF released_at ON public.podcast_episode_queue
FOR EACH ROW EXECUTE FUNCTION public.enqueue_podcast_instagram();

CREATE FUNCTION public.claim_podcast_instagram()
RETURNS SETOF public.podcast_instagram_deliveries LANGUAGE sql SECURITY DEFINER SET search_path = '' AS $$
  UPDATE public.podcast_instagram_deliveries
  SET claim_token = gen_random_uuid(), lease_until = now() + interval '45 seconds'
  WHERE slot_at = public.podcast_release_slot(now()) AND status = 'pending'
    AND (lease_until IS NULL OR lease_until <= now())
    AND EXISTS (SELECT 1 FROM public.podcast_distribution_settings
      WHERE singleton AND feed_enabled AND scheduler_enabled AND instagram_enabled)
  RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_podcast_instagram() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_podcast_instagram() TO service_role;

CREATE OR REPLACE FUNCTION public.dispatch_podcast_tick()RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
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
  IF EXISTS (SELECT 1 FROM public.podcast_episode_queue WHERE release_at = slot) AND NOT EXISTS (
    SELECT 1 FROM public.podcast_instagram_deliveries d
    JOIN public.podcast_distribution_settings s ON s.singleton AND s.instagram_enabled
    WHERE d.slot_at = slot AND d.status = 'pending'
      AND (d.lease_until IS NULL OR d.lease_until <= now())
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
    body := jsonb_build_object('action','podcast-tick'),
    timeout_milliseconds := 120000
  );
END;
$$;
