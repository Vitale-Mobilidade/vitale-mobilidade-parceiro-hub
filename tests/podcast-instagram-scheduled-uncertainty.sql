-- Run only in disposable PostgreSQL after the restoration fixture/schema and release definitions.
BEGIN;
INSERT INTO public.podcast_instagram_deliveries
  (youtube_id,slot_at,status,error_code,scheduled_at)
VALUES ('uncertain01',now()-interval '2 hours','pending','meta_create_uncertain',now()-interval '2 minutes'),
       ('safeclaim01',now()-interval '3 hours','pending',NULL,now()-interval '1 minute');
DO $$
DECLARE claimed public.podcast_instagram_deliveries;
BEGIN
  SELECT * INTO claimed FROM public.claim_scheduled_podcast_instagram();
  IF claimed.youtube_id IS DISTINCT FROM 'safeclaim01' THEN
    RAISE EXCEPTION 'uncertain create must be skipped; safe scheduled delivery must claim';
  END IF;
  IF EXISTS(SELECT 1 FROM public.claim_scheduled_podcast_instagram()) THEN
    RAISE EXCEPTION 'uncertain create or leased delivery must never claim again';
  END IF;
  IF EXISTS(SELECT 1 FROM public.podcast_instagram_deliveries
    WHERE youtube_id='uncertain01' AND (claim_token IS NOT NULL OR lease_until IS NOT NULL)) THEN
    RAISE EXCEPTION 'uncertain delivery lease/history mutated';
  END IF;
END $$;
ROLLBACK;