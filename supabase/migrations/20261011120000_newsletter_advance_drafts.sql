BEGIN;
ALTER TABLE public.newsletter_drafts ADD COLUMN edition_day date;
ALTER TABLE public.newsletter_drafts ADD COLUMN fingerprint text;
-- Automatic drafts have no human author. Human saves still record edited_by.
ALTER TABLE public.newsletter_drafts ALTER COLUMN edited_by DROP NOT NULL;
ALTER TABLE public.newsletter_drafts ADD CONSTRAINT newsletter_drafts_scheduled_fields CHECK (edition_day IS NULL OR (origin='agent' AND fingerprint IS NOT NULL));
CREATE UNIQUE INDEX newsletter_drafts_edition_day ON public.newsletter_drafts(edition_day) WHERE edition_day IS NOT NULL;
ALTER TABLE public.newsletter_drafts ADD COLUMN generation_mode text NOT NULL DEFAULT 'agent' CHECK(generation_mode IN ('agent','fallback'));
CREATE TABLE public.newsletter_preparations (
 edition_day date PRIMARY KEY,
 attempts integer NOT NULL CHECK(attempts BETWEEN 1 AND 3),
 next_attempt_at timestamptz,
 last_error text
);
ALTER TABLE public.newsletter_preparations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_preparations FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.newsletter_preparations TO service_role;
COMMIT;
