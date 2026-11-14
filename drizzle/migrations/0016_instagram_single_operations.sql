CREATE TABLE public.instagram_single_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 automation_enabled boolean NOT NULL DEFAULT false,
 pilot_id uuid,
 automation_issue text
);
INSERT INTO public.instagram_single_settings DEFAULT VALUES;
ALTER TABLE public.instagram_single_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_single_settings FROM PUBLIC, anon, authenticated, sandbox_exec;
GRANT SELECT, UPDATE ON public.instagram_single_settings TO service_role;

CREATE TABLE public.instagram_single_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 video_id text NOT NULL UNIQUE,
 article_id uuid NOT NULL UNIQUE,
 title text NOT NULL,
 caption text NOT NULL CHECK (length(caption) BETWEEN 1 AND 2200),
 asset_path text NOT NULL,
 fingerprint text NOT NULL CHECK (fingerprint ~ '^[0-9a-f]{64}$'),
 state text NOT NULL DEFAULT 'review' CHECK(state IN ('review','scheduled','publishing','published','attention')),
 due_at timestamptz UNIQUE,
 lease uuid,
 lease_until timestamptz,
 error_code text,
 attempted_at timestamptz,
 container_id text,
 media_id text,
 permalink text,
 created_at timestamptz NOT NULL DEFAULT now(),
 published_at timestamptz,
 CHECK (state != 'scheduled' OR due_at IS NOT NULL)
);
ALTER TABLE public.instagram_single_posts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_single_posts FROM PUBLIC, anon, authenticated, sandbox_exec;
GRANT SELECT, INSERT, UPDATE ON public.instagram_single_posts TO service_role;

CREATE FUNCTION public.stage_instagram_single(p_video text,p_article uuid,p_title text,p_caption text,p_path text,p_fingerprint text)
RETURNS TABLE(id uuid,fingerprint text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM 1 FROM public.instagram_single_settings WHERE singleton FOR UPDATE;
 IF NOT FOUND OR EXISTS (SELECT 1 FROM public.instagram_single_posts WHERE state<>'published')
 OR NOT EXISTS (SELECT 1 FROM public.instagram_carousel_sources WHERE video_id=p_video AND article_id=p_article)
 THEN RETURN; END IF;
 RETURN QUERY INSERT INTO public.instagram_single_posts AS p(video_id,article_id,title,caption,asset_path,fingerprint)
 VALUES(p_video,p_article,p_title,p_caption,p_path,p_fingerprint)
 ON CONFLICT (video_id) DO NOTHING RETURNING p.id,p.fingerprint;
 IF FOUND THEN
   UPDATE public.instagram_single_settings SET automation_issue=NULL WHERE singleton;
 END IF;
END $$;

CREATE FUNCTION public.reserve_instagram_single(p_id uuid, p_fingerprint text, p_auto boolean DEFAULT false)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE due timestamptz; cfg public.instagram_single_settings;
BEGIN
 SELECT * INTO cfg FROM public.instagram_single_settings WHERE singleton FOR UPDATE;
 IF NOT FOUND OR (p_auto AND (NOT cfg.automation_enabled OR NOT EXISTS (
    SELECT 1 FROM public.instagram_single_posts WHERE id=cfg.pilot_id AND state='published'
 ))) THEN RETURN NULL; END IF;
 IF EXISTS (SELECT 1 FROM public.instagram_single_posts WHERE state IN ('scheduled','publishing') AND id<>p_id)
 THEN RETURN NULL; END IF;
 SELECT min(slot) INTO due FROM (
   SELECT ((now() AT TIME ZONE 'America/Sao_Paulo')::date + d + t) AT TIME ZONE 'America/Sao_Paulo' AS slot
   FROM generate_series(0,2) d CROSS JOIN unnest(ARRAY[time '06:15',time '11:45',time '17:45']) t
 ) candidates WHERE slot > now() AND NOT EXISTS (SELECT 1 FROM public.instagram_single_posts WHERE due_at=slot);
 UPDATE public.instagram_single_posts p SET state='scheduled',due_at=due,error_code=NULL
 WHERE p.id=p_id AND p.fingerprint=p_fingerprint AND p.attempted_at IS NULL AND due IS NOT NULL
 AND (p.state='review' OR (p.state='attention' AND p.error_code IN ('slot_missed','connection_unavailable')))
 AND NOT EXISTS (SELECT 1 FROM public.podcast_episode_queue q WHERE q.youtube_id=p.video_id AND q.prepared_instagram_post->>'reviewHold'='true')
 AND NOT EXISTS (SELECT 1 FROM public.podcast_instagram_deliveries h WHERE h.youtube_id=p.video_id AND h.status='published')
 AND NOT EXISTS (SELECT 1 FROM public.instagram_carousel_jobs c WHERE c.state='published' AND (c.video_id=p.video_id OR c.article_id=p.article_id));
 IF NOT FOUND THEN RETURN NULL; END IF;
 IF cfg.pilot_id IS NULL THEN
   UPDATE public.instagram_single_settings SET pilot_id=p_id WHERE singleton;
 END IF;
 RETURN due;
END $$;

CREATE FUNCTION public.claim_instagram_single_due()
RETURNS SETOF public.instagram_single_posts LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE claimed uuid;
BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.instagram_single_settings WHERE singleton AND automation_enabled FOR SHARE)
 OR EXISTS (SELECT 1 FROM public.podcast_distribution_settings WHERE singleton AND instagram_enabled)
 OR EXISTS (SELECT 1 FROM public.instagram_carousel_settings WHERE singleton AND publishing_enabled)
 THEN RETURN; END IF;
 UPDATE public.instagram_single_posts SET state='attention',error_code='shipment_unconfirmed'
 WHERE state='publishing' AND lease_until < now();
 UPDATE public.instagram_single_posts SET state='attention',error_code='slot_missed'
 WHERE state='scheduled' AND due_at < now()-interval '10 minutes';
 SELECT p.id INTO claimed FROM public.instagram_single_posts p WHERE p.state='scheduled'
 AND p.due_at BETWEEN now()-interval '10 minutes' AND now() AND p.attempted_at IS NULL
 AND (p.lease_until IS NULL OR p.lease_until < now())
 AND EXISTS (SELECT 1 FROM public.instagram_carousel_sources s WHERE s.video_id=p.video_id AND s.article_id=p.article_id)
 AND NOT EXISTS (SELECT 1 FROM public.podcast_episode_queue q WHERE q.youtube_id=p.video_id AND q.prepared_instagram_post->>'reviewHold'='true')
 AND NOT EXISTS (SELECT 1 FROM public.podcast_instagram_deliveries h WHERE h.youtube_id=p.video_id AND h.status='published')
 AND NOT EXISTS (SELECT 1 FROM public.instagram_carousel_jobs c WHERE c.state='published' AND (c.video_id=p.video_id OR c.article_id=p.article_id))
 ORDER BY p.due_at LIMIT 1 FOR UPDATE OF p SKIP LOCKED;
 RETURN QUERY UPDATE public.instagram_single_posts SET lease=gen_random_uuid(),lease_until=now()+interval '2 minutes'
 WHERE id=claimed RETURNING *;
END $$;

-- Reuse the installed private signing key without consulting the podcast feed or its schedule.
CREATE FUNCTION public.authorize_instagram_single_tick(p_signature text,p_issued_at text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE expected text;
BEGIN
 IF p_signature IS NULL OR p_issued_at IS NULL OR p_signature !~ '^[a-f0-9]{64}$' OR p_issued_at !~ '^[0-9]{10}$'
   OR abs(extract(epoch FROM now()) - p_issued_at::bigint)>90 THEN RETURN false; END IF;
 SELECT encode(extensions.hmac(convert_to(p_issued_at || ':instagram-single-tick','UTF8'),signing_key,'sha256'),'hex') INTO expected
 FROM public.podcast_worker_credentials WHERE singleton;
 RETURN coalesce(expected=p_signature,false);
END $$;

CREATE FUNCTION public.dispatch_instagram_single_tick()
RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE issued text; sig text; local_minute text := to_char(now() AT TIME ZONE 'America/Sao_Paulo','HH24:MI');
BEGIN
 IF local_minute NOT IN ('06:15','11:45','17:45')
 OR NOT EXISTS (SELECT 1 FROM public.instagram_single_settings WHERE singleton AND automation_enabled) THEN RETURN NULL; END IF;
 issued := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
 SELECT encode(extensions.hmac(convert_to(issued || ':instagram-single-tick','UTF8'),signing_key,'sha256'),'hex') INTO sig
 FROM public.podcast_worker_credentials WHERE singleton;
 IF sig IS NULL THEN RETURN NULL; END IF;
 RETURN net.http_post(url:='https://ipectfejftfcikvozoyu.supabase.co/functions/v1/editorial-admin',
 headers:=jsonb_build_object('Content-Type','application/json','x-instagram-single-signature',sig,'x-instagram-single-issued',issued),
 body:=jsonb_build_object('action','instagram-single-tick'),timeout_milliseconds:=110000);
END $$;
REVOKE ALL ON FUNCTION public.stage_instagram_single(text,uuid,text,text,text,text), public.reserve_instagram_single(uuid,text,boolean), public.claim_instagram_single_due(),
 public.authorize_instagram_single_tick(text,text), public.dispatch_instagram_single_tick() FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.stage_instagram_single(text,uuid,text,text,text,text), public.reserve_instagram_single(uuid,text,boolean), public.claim_instagram_single_due(),
 public.authorize_instagram_single_tick(text,text) TO service_role;
SELECT cron.schedule('vitale-instagram-single-morning','15 9 * * *','SELECT public.dispatch_instagram_single_tick();');
SELECT cron.schedule('vitale-instagram-single-midday-evening','45 14,20 * * *','SELECT public.dispatch_instagram_single_tick();');
