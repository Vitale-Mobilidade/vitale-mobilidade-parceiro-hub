-- Publishing is the completion authority for the original video generation.
CREATE OR REPLACE FUNCTION public.close_editorial_source_on_publication() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.status='published' AND NEW.published_at IS NOT NULL AND NEW.validation_errors='[]'::jsonb
     AND (TG_OP='INSERT' OR OLD.status IS DISTINCT FROM 'published') THEN
    UPDATE youtube_editorial_sources SET state='done',article_id=NEW.id,caption_retry_at=NULL
    WHERE video_id=NEW.video_id AND (article_id IS NULL OR article_id=NEW.id)
      AND state<>'done' AND state_changed_at<=NEW.published_at;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.close_editorial_source_on_publication() FROM public,anon,authenticated,service_role;
CREATE TRIGGER editorial_publication_closes_source AFTER INSERT OR UPDATE OF status ON public.editorial_articles
FOR EACH ROW EXECUTE FUNCTION public.close_editorial_source_on_publication();

-- A late error from the old execution must not undo a completed publication.
CREATE OR REPLACE FUNCTION public.preserve_editorial_source_completion() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NEW.state IN ('needs_review','rewrite_pending','cover_pending','cover_render_pending','publish_pending') AND NEW.state IS DISTINCT FROM OLD.state AND EXISTS (
    SELECT 1 FROM editorial_articles a WHERE a.video_id=NEW.video_id AND a.id=NEW.article_id
      AND a.status='published' AND a.published_at IS NOT NULL AND a.validation_errors='[]'::jsonb
      AND (OLD.state='done' OR a.published_at>=OLD.state_changed_at)
  ) THEN NEW.state:='done'; NEW.caption_retry_at:=NULL; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.preserve_editorial_source_completion() FROM public,anon,authenticated,service_role;
CREATE TRIGGER a_preserve_editorial_source_completion BEFORE UPDATE OF state ON public.youtube_editorial_sources
FOR EACH ROW EXECUTE FUNCTION public.preserve_editorial_source_completion();

-- Existing settled publications, including manual recovery, converge without replay.
UPDATE public.youtube_editorial_sources s SET state='done',article_id=a.id,caption_retry_at=NULL
FROM public.editorial_articles a WHERE a.video_id=s.video_id AND (s.article_id IS NULL OR s.article_id=a.id)
  AND s.state<>'done' AND a.status='published' AND a.published_at IS NOT NULL
  AND a.validation_errors='[]'::jsonb AND a.published_at>=s.state_changed_at;
