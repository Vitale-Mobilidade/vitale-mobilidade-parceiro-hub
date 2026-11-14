-- REVIEW ONLY. Never apply outside official migrator; no journal/Growth/cron edits.
CREATE TABLE public.instagram_single_posts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 video_id text NOT NULL, article_id uuid NOT NULL,
 revision integer NOT NULL DEFAULT 1,
 state text NOT NULL DEFAULT 'draft',
 art_version integer NOT NULL DEFAULT 5,
 caption text NOT NULL DEFAULT '', asset_path text, asset_hash text,
 approved_hash text, review_hold boolean NOT NULL DEFAULT false,
 due_at timestamptz, lease_token uuid, lease_until timestamptz,
 create_attempted boolean NOT NULL DEFAULT false,
 publish_attempted boolean NOT NULL DEFAULT false,
 container_id text, media_id text, permalink text, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(video_id), UNIQUE(article_id),
 CONSTRAINT instagram_single_state CHECK(state IN ('draft','ready','scheduled','publishing','uncertain','published')),
 CONSTRAINT instagram_single_revision CHECK(revision>0)
);
GRANT ALL ON public.instagram_single_posts TO service_role;
ALTER TABLE public.instagram_single_posts ENABLE ROW LEVEL SECURITY;
-- Browser has no grants/policies. Admin requests authenticate existing membership server-side.
CREATE TABLE public.instagram_single_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 generation_enabled boolean NOT NULL DEFAULT false,
 publishing_enabled boolean NOT NULL DEFAULT false,
 automation_enabled boolean NOT NULL DEFAULT false
);
GRANT ALL ON public.instagram_single_settings TO service_role;
ALTER TABLE public.instagram_single_settings ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.claim_instagram_single_post(p_id uuid,p_revision integer,p_token uuid)
RETURNS SETOF public.instagram_single_posts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN QUERY UPDATE public.instagram_single_posts p
 SET lease_token=p_token,lease_until=now()+interval '2 minutes',updated_at=now()
 WHERE p.id=p_id AND p.revision=p_revision
 AND p.state IN ('draft','ready','scheduled') AND NOT p.review_hold
 AND NOT p.create_attempted AND NOT p.publish_attempted
 AND (p.lease_until IS NULL OR p.lease_until<now())
 AND NOT EXISTS(SELECT 1 FROM public.podcast_instagram_deliveries d WHERE d.youtube_id=p.video_id AND d.status='published')
 AND NOT EXISTS(SELECT 1 FROM public.instagram_carousel_jobs j WHERE j.state='published' AND (j.video_id=p.video_id OR j.article_id=p.article_id))
 AND NOT EXISTS(SELECT 1 FROM public.podcast_episode_queue q WHERE q.youtube_id=p.video_id AND q.prepared_instagram_post->>'reviewHold'='true')
 RETURNING p.*;
END $$;
REVOKE ALL ON FUNCTION public.claim_instagram_single_post(uuid,integer,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_instagram_single_post(uuid,integer,uuid) TO service_role;
-- No rows seeded, no real schedule or cron installed; missing singleton fails closed.