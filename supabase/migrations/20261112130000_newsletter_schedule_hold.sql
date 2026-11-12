BEGIN;
ALTER TABLE public.newsletter_drafts
  ADD COLUMN schedule_hold boolean NOT NULL DEFAULT false,
  ADD CONSTRAINT newsletter_draft_hold_requires_edition CHECK (
    NOT schedule_hold OR (edition_day IS NOT NULL AND approved_revision IS NULL)
  );

-- Keep the hold effective even if the application/worker is rolled back.
CREATE FUNCTION public.newsletter_guard_campaign_hold() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
DECLARE held boolean;
BEGIN
  SELECT schedule_hold INTO held FROM public.newsletter_drafts
  WHERE edition_day = NEW.edition_day
  FOR SHARE;
  IF held THEN
    RAISE EXCEPTION 'newsletter_draft_held' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.newsletter_guard_campaign_hold() FROM PUBLIC;
CREATE TRIGGER newsletter_campaign_hold_guard
  BEFORE INSERT ON public.newsletter_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.newsletter_guard_campaign_hold();
COMMIT;
