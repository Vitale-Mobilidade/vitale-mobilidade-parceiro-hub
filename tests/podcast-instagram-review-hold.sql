-- Disposable PostgreSQL only: fixture + restoration definitions loaded before this test.
BEGIN;
INSERT INTO public.podcast_episode_queue(youtube_id,title,prepared_instagram_post,release_at)
VALUES ('hvtzaWLnM14','OUXI','{"reviewHold":true}',public.podcast_release_slot(now()));
UPDATE public.podcast_episode_queue SET released_at=now() WHERE youtube_id='hvtzaWLnM14';
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM public.podcast_instagram_deliveries WHERE youtube_id='hvtzaWLnM14' AND status='pending') THEN RAISE EXCEPTION 'RSS must enqueue held pending'; END IF;
 IF EXISTS (SELECT 1 FROM public.claim_podcast_instagram() WHERE youtube_id='hvtzaWLnM14') THEN RAISE EXCEPTION 'current claim must skip reviewHold'; END IF;
 UPDATE public.podcast_instagram_deliveries SET scheduled_at=now()-interval '1 minute' WHERE youtube_id='hvtzaWLnM14';
 IF EXISTS (SELECT 1 FROM public.claim_scheduled_podcast_instagram() WHERE youtube_id='hvtzaWLnM14') THEN RAISE EXCEPTION 'scheduled claim must skip reviewHold'; END IF;
 IF EXISTS (SELECT 1 FROM public.podcast_instagram_deliveries WHERE youtube_id='hvtzaWLnM14' AND (claim_token IS NOT NULL OR lease_until IS NOT NULL OR status<>'pending')) THEN RAISE EXCEPTION 'held history mutated'; END IF;
END $$;
ROLLBACK;