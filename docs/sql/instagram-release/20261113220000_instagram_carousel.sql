-- PENDING VERSIONED MIGRATION: NEVER APPLY as part of this build.
-- Protected migration journals refuse unapplied migrations; promote byte-for-byte
-- through the official migration tool ONLY after separate release approval.
CREATE TABLE public.instagram_carousel_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), generation_enabled boolean NOT NULL DEFAULT false,
 publishing_enabled boolean NOT NULL DEFAULT false, automation_enabled boolean NOT NULL DEFAULT false,
 activated_at timestamptz,cursor_at timestamptz,paused_reason text
);
GRANT ALL ON public.instagram_carousel_settings TO service_role;
ALTER TABLE public.instagram_carousel_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_carousel_settings FROM PUBLIC,anon,authenticated;
INSERT INTO public.instagram_carousel_settings(singleton) VALUES(true);
CREATE TABLE public.instagram_carousel_jobs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),video_id text NOT NULL REFERENCES public.editorial_videos(youtube_id),
 article_id uuid NOT NULL REFERENCES public.editorial_articles(id),state text NOT NULL DEFAULT 'queued'
 CHECK(state IN ('queued','scripting','scene','rendering','review','approved','publishing','uncertain','published','blocked')),
 revision integer NOT NULL DEFAULT 1,source jsonb NOT NULL,script jsonb,assets jsonb NOT NULL DEFAULT '[]',
 scene_path text,scene_attempted boolean NOT NULL DEFAULT false,script_attempted boolean NOT NULL DEFAULT false,
 scene_omitted boolean NOT NULL DEFAULT false,approved_revision integer,approved_by uuid,
 lease_token uuid,lease_until timestamptz,error_code text,error_message text,children jsonb NOT NULL DEFAULT '[]',album_id text,
 publish_attempted boolean NOT NULL DEFAULT false,media_id text,permalink text,media_token_hash text,media_expires_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now(),UNIQUE(video_id,article_id)
);
GRANT ALL ON public.instagram_carousel_jobs TO service_role;
ALTER TABLE public.instagram_carousel_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.instagram_carousel_jobs FROM PUBLIC,anon,authenticated;
CREATE INDEX instagram_carousel_state ON public.instagram_carousel_jobs(state,created_at);
CREATE VIEW public.instagram_carousel_sources WITH(security_invoker=true) AS
 SELECT v.youtube_id AS video_id,v.title AS video_title,v.published_on AS video_date,v.transcript,
 a.id AS article_id,a.title AS article_title,a.slug AS article_slug,a.published_at,
 greatest(a.published_at,v.updated_at) AS eligible_at,
 ARRAY(SELECT DISTINCT x FROM unnest(ARRAY[v.primary_bike_id,a.primary_bike_id]||v.related_bike_ids||a.related_bike_ids) x WHERE x IS NOT NULL) AS bike_ids
 FROM public.editorial_videos v JOIN public.editorial_articles a ON a.video_id=v.youtube_id
 WHERE v.status='active' AND nullif(btrim(v.transcript),'') IS NOT NULL AND v.published_on IS NOT NULL
 AND v.published_on<=current_date AND a.status='published' AND nullif(a.slug,'') IS NOT NULL AND a.published_at<=now();
REVOKE ALL ON public.instagram_carousel_sources FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.instagram_carousel_sources TO service_role;
CREATE FUNCTION public.claim_instagram_carousel(p_id uuid,p_revision integer,p_token uuid)
RETURNS SETOF public.instagram_carousel_jobs LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.instagram_carousel_jobs SET lease_token=p_token,lease_until=now()+interval '15 minutes',updated_at=now()
 WHERE id=p_id AND revision=p_revision AND (lease_until IS NULL OR lease_until<now()) AND state<>'published' RETURNING *;
$$;
REVOKE ALL ON FUNCTION public.claim_instagram_carousel(uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_instagram_carousel(uuid,integer,uuid) TO service_role;
CREATE FUNCTION public.discover_instagram_carousels()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE cfg public.instagram_carousel_settings;inserted integer;
BEGIN
 SELECT * INTO cfg FROM public.instagram_carousel_settings WHERE singleton FOR UPDATE;
 IF NOT cfg.automation_enabled OR NOT cfg.generation_enabled OR cfg.paused_reason IS NOT NULL THEN RETURN 0;END IF;
 IF cfg.activated_at IS NULL THEN UPDATE public.instagram_carousel_settings SET activated_at=now(),cursor_at=now() WHERE singleton;RETURN 0;END IF;
 INSERT INTO public.instagram_carousel_jobs(video_id,article_id,source)
 SELECT video_id,article_id,jsonb_build_object('videoId',video_id,'videoTitle',video_title,'videoDate',video_date,
 'transcript',transcript,'articleId',article_id,'articleTitle',article_title,'articleSlug',article_slug,
 'publishedAt',published_at,'bikeIds',bike_ids,'eligibleAt',eligible_at)
 FROM public.instagram_carousel_sources WHERE eligible_at>greatest(cfg.activated_at,coalesce(cfg.cursor_at,cfg.activated_at))
 ORDER BY eligible_at,video_id,article_id ON CONFLICT(video_id,article_id) DO NOTHING;
 GET DIAGNOSTICS inserted=ROW_COUNT;
 UPDATE public.instagram_carousel_settings SET cursor_at=now() WHERE singleton;RETURN inserted;
END $$;
REVOKE ALL ON FUNCTION public.discover_instagram_carousels() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.discover_instagram_carousels() TO service_role;
-- Neutralize legacy social dispatch and claims, preserving every history/job.
CREATE OR REPLACE FUNCTION public.enqueue_podcast_instagram()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN RETURN NEW;END $$;
CREATE OR REPLACE FUNCTION public.dispatch_podcast_instagram_schedule()
RETURNS bigint LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT NULL::bigint $$;
CREATE OR REPLACE FUNCTION public.claim_podcast_instagram()
RETURNS SETOF public.podcast_instagram_deliveries LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT * FROM public.podcast_instagram_deliveries WHERE false $$;
CREATE OR REPLACE FUNCTION public.claim_scheduled_podcast_instagram()
RETURNS SETOF public.podcast_instagram_deliveries LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT * FROM public.podcast_instagram_deliveries WHERE false $$;
CREATE OR REPLACE FUNCTION public.schedule_podcast_instagram_delivery(p_episode_id text,p_local_time text)
RETURNS timestamptz LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$ SELECT NULL::timestamptz $$;
ALTER TABLE public.podcast_episode_queue ADD COLUMN prepared_cover_path text;
GRANT UPDATE(prepared_cover_path) ON public.podcast_episode_queue TO service_role;
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
AND (q.prepared_cover_path IS NOT NULL OR q.prepared_article_version IS NOT NULL);
-- Version branch preserves existing prepared episodes without rewriting data.
