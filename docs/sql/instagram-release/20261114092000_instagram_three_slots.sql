CREATE OR REPLACE FUNCTION public.stage_instagram_single(p_video text,p_article uuid,p_title text,p_caption text,p_path text,p_fingerprint text)
RETURNS TABLE(id uuid,fingerprint text) LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
 PERFORM 1 FROM public.instagram_single_settings WHERE singleton FOR UPDATE;
 IF NOT FOUND OR 3 <= (SELECT count(*) FROM public.instagram_single_posts WHERE state IN ('review','scheduled','publishing'))
 OR NOT EXISTS (SELECT 1 FROM public.instagram_carousel_sources WHERE video_id=p_video AND article_id=p_article)
 OR EXISTS (SELECT 1 FROM public.podcast_episode_queue q WHERE q.youtube_id=p_video AND q.prepared_instagram_post->>'reviewHold'='true')
 OR EXISTS (SELECT 1 FROM public.podcast_instagram_deliveries d WHERE d.youtube_id=p_video AND d.status='published')
 OR EXISTS (SELECT 1 FROM public.instagram_carousel_jobs c WHERE c.state='published' AND (c.video_id=p_video OR c.article_id=p_article))
 THEN RETURN; END IF;
 RETURN QUERY INSERT INTO public.instagram_single_posts AS p(video_id,article_id,title,caption,asset_path,fingerprint)
 VALUES(p_video,p_article,p_title,p_caption,p_path,p_fingerprint)
 ON CONFLICT (video_id) DO NOTHING RETURNING p.id,p.fingerprint;
 IF FOUND THEN
   UPDATE public.instagram_single_settings SET automation_issue=NULL WHERE singleton;
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.reserve_instagram_single(p_id uuid, p_fingerprint text, p_auto boolean DEFAULT false)
RETURNS timestamptz LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE due timestamptz; cfg public.instagram_single_settings;
BEGIN
 SELECT * INTO cfg FROM public.instagram_single_settings WHERE singleton FOR UPDATE;
 IF NOT FOUND OR (p_auto AND (NOT cfg.automation_enabled OR NOT EXISTS (
    SELECT 1 FROM public.instagram_single_posts WHERE id=cfg.pilot_id AND state IN ('scheduled','publishing','published')
 ))) THEN RETURN NULL; END IF;
 IF 3 <= (SELECT count(*) FROM public.instagram_single_posts WHERE state IN ('scheduled','publishing') AND id<>p_id)
 THEN RETURN NULL; END IF;
 SELECT min(slot) INTO due FROM (
   SELECT ((now() AT TIME ZONE 'America/Sao_Paulo')::date + d + t) AT TIME ZONE 'America/Sao_Paulo' AS slot
   FROM generate_series(0,7) d CROSS JOIN unnest(ARRAY[time '06:15',time '11:45',time '17:45']) t
 ) candidates WHERE slot > now() AND NOT EXISTS (SELECT 1 FROM public.instagram_single_posts WHERE due_at=slot);
 UPDATE public.instagram_single_posts p SET state='scheduled',due_at=due,error_code=NULL
 WHERE p.id=p_id AND EXISTS (SELECT 1 FROM public.instagram_carousel_sources s WHERE s.video_id=p.video_id AND s.article_id=p.article_id)
 AND p.fingerprint=p_fingerprint AND p.attempted_at IS NULL AND due IS NOT NULL
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
