BEGIN;
CREATE TABLE public.newsletter_drafts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 content jsonb NOT NULL,
 revision integer NOT NULL DEFAULT 1 CHECK(revision>0),
 origin text NOT NULL CHECK(origin IN ('agent','test_import')),
 edited_by uuid NOT NULL REFERENCES auth.users(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.newsletter_drafts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_drafts FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.newsletter_drafts TO service_role;
CREATE INDEX newsletter_drafts_updated ON public.newsletter_drafts(updated_at DESC);
COMMIT;
