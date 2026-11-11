CREATE TABLE public.podcast_worker_credentials (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  actor_id uuid REFERENCES auth.users(id),
  signing_key bytea NOT NULL DEFAULT extensions.gen_random_bytes(32)
);
INSERT INTO public.podcast_worker_credentials DEFAULT VALUES;
ALTER TABLE public.podcast_worker_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podcast_worker_credentials FROM PUBLIC, anon, authenticated, service_role;

CREATE FUNCTION public.authorize_podcast_tick(p_signature text, p_issued_at text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  credentials public.podcast_worker_credentials;
  expected text;
BEGIN
  IF p_signature IS NULL OR p_signature !~ '^[a-f0-9]{64}$'
    OR p_issued_at IS NULL OR p_issued_at !~ '^[0-9]{10}$' THEN RETURN NULL; END IF;
  IF abs(extract(epoch FROM now()) - p_issued_at::bigint) > 120 THEN RETURN NULL; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled) THEN RETURN NULL; END IF;
  SELECT * INTO credentials FROM public.podcast_worker_credentials WHERE singleton;
  expected := encode(extensions.hmac(convert_to(p_issued_at || ':podcast-tick','UTF8'),
    credentials.signing_key,'sha256'),'hex');
  IF expected IS DISTINCT FROM p_signature THEN RETURN NULL; END IF;
  RETURN credentials.actor_id;
END;
$$;
REVOKE ALL ON FUNCTION public.authorize_podcast_tick(text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.authorize_podcast_tick(text,text) TO service_role;

CREATE FUNCTION public.dispatch_podcast_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  credentials public.podcast_worker_credentials;
  local_now timestamp := now() AT TIME ZONE 'America/Sao_Paulo';
  slot timestamptz;
  issued text;
  signature text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.podcast_distribution_settings
    WHERE singleton AND feed_enabled AND scheduler_enabled) THEN RETURN NULL; END IF;
  IF local_now::time >= time '11:45' AND local_now::time < time '11:50' THEN
    slot := (local_now::date + time '11:45') AT TIME ZONE 'America/Sao_Paulo';
  ELSIF local_now::time >= time '17:45' AND local_now::time < time '17:50' THEN
    slot := (local_now::date + time '17:45') AT TIME ZONE 'America/Sao_Paulo';
  ELSE RETURN NULL;
  END IF;
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
REVOKE ALL ON FUNCTION public.dispatch_podcast_tick() FROM PUBLIC, anon, authenticated, service_role;
-- Cron is intentionally not registered by this migration.
