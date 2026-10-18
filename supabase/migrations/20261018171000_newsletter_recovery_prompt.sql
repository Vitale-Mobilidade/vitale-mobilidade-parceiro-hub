BEGIN;
ALTER TABLE public.newsletter_preparations ADD COLUMN feedback jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(feedback)='array');
CREATE TABLE public.newsletter_rewrites (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 draft_id uuid NOT NULL REFERENCES public.newsletter_drafts(id),
 base_revision integer NOT NULL CHECK(base_revision>0),
 prompt text NOT NULL CHECK(length(prompt) BETWEEN 10 AND 2000),
 actor_id uuid NOT NULL,
 status text NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','ready','failed','conflict','applied')),
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 2),
 next_attempt_at timestamptz NOT NULL DEFAULT now(),
 feedback jsonb NOT NULL DEFAULT '[]'::jsonb,
 last_error text,
 candidate jsonb,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(status NOT IN ('ready','applied') OR candidate IS NOT NULL)
);
CREATE UNIQUE INDEX newsletter_rewrite_pending ON public.newsletter_rewrites(draft_id) WHERE status IN ('queued','running','ready');
CREATE INDEX newsletter_rewrite_due ON public.newsletter_rewrites(next_attempt_at,created_at) WHERE status IN ('queued','running');
ALTER TABLE public.newsletter_rewrites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.newsletter_rewrites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.newsletter_rewrites TO service_role;
-- Keep dispatcher available for an admin-requested rewrite even while delivery is paused.
CREATE OR REPLACE FUNCTION public.newsletter_dispatch() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE settings public.newsletter_settings; issued text; sig text; BEGIN
 SELECT * INTO settings FROM newsletter_settings WHERE singleton;
 IF settings.signing_key IS NULL OR (NOT settings.enabled AND NOT EXISTS(SELECT 1 FROM newsletter_rewrites WHERE status IN ('queued','running') AND next_attempt_at<=now())) THEN RETURN NULL; END IF;
 issued:=floor(extract(epoch FROM clock_timestamp()))::bigint::text;
 sig:=encode(extensions.hmac(convert_to(issued||':newsletter','UTF8'),settings.signing_key,'sha256'),'hex');
 RETURN net.http_post(url:='https://vitalemobilidade.com/api/public/newsletter-worker',headers:=jsonb_build_object('Content-Type','application/json','x-worker-issued-at',issued,'x-worker-signature',sig),body:='{}'::jsonb,timeout_milliseconds:=180000);
END $$;
COMMIT;
