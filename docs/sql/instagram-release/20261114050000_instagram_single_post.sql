-- STAGED ONLY. Official migration required after review; not applied by this build.
CREATE TABLE public.instagram_post_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),generation_enabled boolean NOT NULL DEFAULT false,
 publishing_enabled boolean NOT NULL DEFAULT false,scheduling_enabled boolean NOT NULL DEFAULT false,paused_reason text
);
GRANT ALL ON public.instagram_post_settings TO service_role;
ALTER TABLE public.instagram_post_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_post_settings FROM PUBLIC,anon,authenticated;
INSERT INTO public.instagram_post_settings(singleton) VALUES(true);
CREATE TABLE public.instagram_post_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),video_id text NOT NULL,article_id uuid NOT NULL REFERENCES public.editorial_articles(id),
 revision integer NOT NULL DEFAULT 1,source jsonb NOT NULL,state text NOT NULL DEFAULT 'queued'
 CHECK(state IN ('queued','preparing','review','approved','scheduled','publishing','published','blocked','uncertain')),
 caption jsonb,asset jsonb,caption_attempted boolean NOT NULL DEFAULT false,
 approved_revision integer,approved_by uuid,approved_hash text,
 lease_token uuid,lease_until timestamptz,due_at timestamptz,
 create_attempted boolean NOT NULL DEFAULT false,container_id text,publish_attempted boolean NOT NULL DEFAULT false,
 media_id text,permalink text,media_token_hash text,media_expires_at timestamptz,error_code text,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(video_id),UNIQUE(article_id)
);
GRANT ALL ON public.instagram_post_jobs TO service_role;
ALTER TABLE public.instagram_post_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_post_jobs FROM PUBLIC,anon,authenticated;
-- Cancelled/missed reservations continue to consume the window: never two posts per window.
CREATE TABLE public.instagram_post_slots (
 due_at timestamptz PRIMARY KEY,job_id uuid NOT NULL REFERENCES public.instagram_post_jobs(id),revision integer NOT NULL,
 fingerprint text NOT NULL,actor_id uuid NOT NULL,state text NOT NULL DEFAULT 'reserved'
 CHECK(state IN ('reserved','cancelled','missed','published','uncertain'))
);
GRANT ALL ON public.instagram_post_slots TO service_role;
ALTER TABLE public.instagram_post_slots ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_post_slots FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.instagram_post_seen(p_video text,p_article uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.instagram_carousel_jobs WHERE (video_id=p_video OR article_id=p_article) AND (state='published' OR publish_attempted))
 OR EXISTS(SELECT 1 FROM public.podcast_instagram_deliveries WHERE youtube_id=p_video AND (status='published' OR publish_attempted_at IS NOT NULL));
$$;
CREATE FUNCTION public.enqueue_instagram_post(p_video text,p_article uuid,p_source jsonb,p_actor uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE result uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.instagram_post_settings WHERE singleton AND generation_enabled AND paused_reason IS NULL) THEN RAISE EXCEPTION 'generation_disabled'; END IF;
 IF p_source->>'videoId' IS DISTINCT FROM p_video OR p_source->>'articleId' IS DISTINCT FROM p_article::text OR octet_length(p_source::text)>500000 THEN RAISE EXCEPTION 'source_invalid'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.instagram_carousel_sources WHERE video_id=p_video AND article_id=p_article) THEN RAISE EXCEPTION 'source_invalid'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(p_video,715));
 IF public.instagram_post_seen(p_video,p_article) THEN RAISE EXCEPTION 'topic_already_sent_or_uncertain'; END IF;
 SELECT id INTO result FROM public.instagram_post_jobs WHERE video_id=p_video OR article_id=p_article;
 IF result IS NULL THEN INSERT INTO public.instagram_post_jobs(video_id,article_id,source) VALUES(p_video,p_article,p_source) RETURNING id INTO result; END IF;
 RETURN result;
END $$;
CREATE FUNCTION public.claim_instagram_post(p_id uuid,p_revision integer,p_token uuid) RETURNS SETOF public.instagram_post_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN QUERY UPDATE public.instagram_post_jobs SET lease_token=p_token,lease_until=now()+interval '15 minutes',updated_at=now()
 WHERE id=p_id AND revision=p_revision AND state NOT IN ('published','uncertain') AND (lease_until IS NULL OR lease_until<now()) RETURNING *;
END $$;
CREATE FUNCTION public.schedule_instagram_post(p_id uuid,p_revision integer,p_actor uuid,p_hash text,p_cancel boolean DEFAULT false) RETURNS timestamptz
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE j public.instagram_post_jobs;candidate timestamptz;d integer;t time;result timestamptz;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'admin_required'; END IF;
 PERFORM pg_advisory_xact_lock(715,10801350);
 SELECT * INTO j FROM public.instagram_post_jobs WHERE id=p_id FOR UPDATE;
 IF NOT FOUND OR j.revision<>p_revision OR (j.state NOT IN ('approved','scheduled') AND NOT(j.state='blocked' AND j.error_code='window_missed')) OR j.approved_revision IS DISTINCT FROM j.revision OR j.approved_by IS NULL OR j.approved_hash IS DISTINCT FROM p_hash OR p_hash !~ '^[a-f0-9]{64}$' OR j.create_attempted OR j.publish_attempted OR j.lease_until>now() THEN RAISE EXCEPTION 'revision_unapproved_or_busy'; END IF;
 IF j.due_at IS NOT NULL THEN
  UPDATE public.instagram_post_slots SET state='cancelled' WHERE due_at=j.due_at AND job_id=j.id AND state='reserved';
 END IF;
 IF p_cancel THEN UPDATE public.instagram_post_jobs SET due_at=NULL,state='approved' WHERE id=j.id;RETURN NULL;END IF;
 IF NOT EXISTS(SELECT 1 FROM public.instagram_post_settings WHERE singleton AND publishing_enabled AND scheduling_enabled AND paused_reason IS NULL) THEN RAISE EXCEPTION 'scheduling_disabled'; END IF;
 IF public.instagram_post_seen(j.video_id,j.article_id) THEN RAISE EXCEPTION 'topic_already_sent_or_uncertain'; END IF;
 FOR d IN 0..365 LOOP
  FOREACH t IN ARRAY ARRAY[time '06:15',time '11:45',time '17:45'] LOOP
   candidate:=(((now() AT TIME ZONE 'America/Sao_Paulo')::date+d)+t) AT TIME ZONE 'America/Sao_Paulo';
   IF candidate>now() AND NOT EXISTS(SELECT 1 FROM public.instagram_post_slots WHERE due_at=candidate) THEN
    INSERT INTO public.instagram_post_slots(due_at,job_id,revision,fingerprint,actor_id) VALUES(candidate,j.id,j.revision,p_hash,p_actor);
    UPDATE public.instagram_post_jobs SET due_at=candidate,state='scheduled',error_code=NULL WHERE id=j.id;RETURN candidate;
   END IF;
  END LOOP;
 END LOOP;
 RAISE EXCEPTION 'slots_full';
END $$;
CREATE FUNCTION public.claim_due_instagram_post(p_token uuid) RETURNS SETOF public.instagram_post_jobs
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.instagram_post_settings WHERE singleton AND publishing_enabled AND scheduling_enabled AND paused_reason IS NULL) THEN RETURN; END IF;
 UPDATE public.instagram_post_jobs SET state='uncertain',error_code='lease_expired' WHERE state='publishing' AND lease_until<now();
 UPDATE public.instagram_post_slots s SET state='uncertain' FROM public.instagram_post_jobs j WHERE s.job_id=j.id AND j.state='uncertain' AND s.state='reserved';
 UPDATE public.instagram_post_jobs SET state='blocked',error_code='window_missed' WHERE state='scheduled' AND due_at<now()-interval '5 minutes';
 UPDATE public.instagram_post_slots SET state='missed' WHERE state='reserved' AND due_at<now()-interval '5 minutes';
 RETURN QUERY UPDATE public.instagram_post_jobs j SET state='publishing',lease_token=p_token,lease_until=now()+interval '5 minutes',updated_at=now()
 WHERE j.id=(SELECT x.id FROM public.instagram_post_jobs x JOIN public.instagram_post_slots s ON s.job_id=x.id AND s.due_at=x.due_at
  WHERE x.state='scheduled' AND x.due_at<=now() AND x.due_at>=now()-interval '5 minutes' AND s.state='reserved'
   AND s.revision=x.revision AND s.fingerprint=x.approved_hash AND NOT public.instagram_post_seen(x.video_id,x.article_id)
  ORDER BY x.due_at,x.id FOR UPDATE OF x SKIP LOCKED LIMIT 1) RETURNING j.*;
END $$;
REVOKE ALL ON FUNCTION public.instagram_post_seen(text,uuid),public.enqueue_instagram_post(text,uuid,jsonb,uuid),public.claim_instagram_post(uuid,integer,uuid),public.schedule_instagram_post(uuid,integer,uuid,text,boolean),public.claim_due_instagram_post(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.instagram_post_seen(text,uuid),public.enqueue_instagram_post(text,uuid,jsonb,uuid),public.claim_instagram_post(uuid,integer,uuid),public.schedule_instagram_post(uuid,integer,uuid,text,boolean),public.claim_due_instagram_post(uuid) TO service_role;
-- No cron installation, HTTP SQL or existing pipeline writes. Managed callbacks configured separately.