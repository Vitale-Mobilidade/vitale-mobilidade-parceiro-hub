-- Private additive newsletter ledger. No existing subscription is enabled by migration.
BEGIN;
ALTER TABLE public.newsletter_subscriptions ADD COLUMN IF NOT EXISTS interest text NOT NULL DEFAULT 'general' CHECK (interest IN ('general','radar','content'));
ALTER TABLE public.newsletter_subscriptions ADD COLUMN IF NOT EXISTS resend_contact_id text;
ALTER TABLE public.newsletter_subscriptions ADD COLUMN IF NOT EXISTS suppressed_at timestamptz;

CREATE TABLE public.newsletter_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 from_email text NOT NULL DEFAULT '', reply_to text NOT NULL DEFAULT 'guilherme@hotpipe.com.br',
 segments jsonb NOT NULL DEFAULT '{}'::jsonb,
 retry_until timestamptz, last_error text, updated_at timestamptz NOT NULL DEFAULT now(),
 signing_key bytea NOT NULL DEFAULT extensions.gen_random_bytes(32),
 lease_token uuid, lease_until timestamptz
);
INSERT INTO public.newsletter_settings(singleton) VALUES(true);
CREATE TABLE public.newsletter_campaigns (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), edition_day date NOT NULL,
 segment text NOT NULL CHECK(segment IN ('general','radar','content')),
 status text NOT NULL DEFAULT 'syncing' CHECK(status IN ('syncing','creating','ready','submitting','submitted','sent','uncertain','failed','skipped','paused')),
 payload jsonb NOT NULL, fingerprint text NOT NULL,
 resend_id text UNIQUE, last_error text, created_at timestamptz NOT NULL DEFAULT now(),
 submitted_at timestamptz, sent_at timestamptz,
 UNIQUE(edition_day,segment)
);
CREATE TABLE public.newsletter_recipients (
 campaign_id uuid NOT NULL REFERENCES public.newsletter_campaigns(id),
 subscription_id uuid NOT NULL REFERENCES public.newsletter_subscriptions(id),
 edition_day date NOT NULL, synced boolean NOT NULL DEFAULT false,
 excluded boolean NOT NULL DEFAULT false, consent_at timestamptz NOT NULL,
 PRIMARY KEY(campaign_id,subscription_id), UNIQUE(edition_day,subscription_id)
);
CREATE TABLE public.newsletter_webhook_events (
 event_id text PRIMARY KEY, event_type text NOT NULL, campaign_id uuid REFERENCES newsletter_campaigns(id), email_id text, received_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX newsletter_email_event_unique ON public.newsletter_webhook_events(email_id,event_type) WHERE email_id IS NOT NULL;
CREATE INDEX newsletter_event_campaign ON public.newsletter_webhook_events(campaign_id);
DO $$DECLARE tbl text; BEGIN
 FOREACH tbl IN ARRAY ARRAY['newsletter_settings','newsletter_campaigns','newsletter_recipients','newsletter_webhook_events'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',tbl);
  EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',tbl);
  EXECUTE format('GRANT ALL ON public.%I TO service_role',tbl);
 END LOOP;
END $$;

CREATE FUNCTION public.newsletter_acquire() RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE tok uuid; BEGIN
 UPDATE newsletter_settings SET lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes'
 WHERE singleton AND (lease_until IS NULL OR lease_until<now()) RETURNING lease_token INTO tok;
 RETURN tok;
END $$;
CREATE FUNCTION public.newsletter_release(tok uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE newsletter_settings SET lease_until=NULL,lease_token=NULL WHERE singleton AND lease_token=tok;
$$;
CREATE FUNCTION public.newsletter_renew(tok uuid) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 UPDATE newsletter_settings SET lease_until=now()+interval '5 minutes' WHERE singleton AND lease_token=tok AND lease_until>now();
 RETURN FOUND;
END $$;

CREATE FUNCTION public.newsletter_set_enabled(p_enabled boolean,actor_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM editorial_admin_memberships m WHERE m.user_id=actor_id AND m.active AND m.role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 UPDATE newsletter_settings SET enabled=p_enabled,updated_at=now() WHERE singleton;
 IF p_enabled THEN
  UPDATE newsletter_subscriptions SET delivery_enabled=true WHERE status='interested' AND consent_version='v2' AND suppressed_at IS NULL;
 END IF;
 PERFORM cron.alter_job(jobid,active:=p_enabled) FROM cron.job WHERE jobname='vitale-newsletter';
END $$;

CREATE FUNCTION public.newsletter_subscription_delivery() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 NEW.delivery_enabled:= NEW.status='interested' AND NEW.consent_version='v2' AND NEW.suppressed_at IS NULL AND COALESCE((SELECT enabled FROM newsletter_settings WHERE singleton),false);
 RETURN NEW;
END $$;
CREATE TRIGGER newsletter_delivery_gate BEFORE INSERT OR UPDATE ON public.newsletter_subscriptions FOR EACH ROW EXECUTE FUNCTION public.newsletter_subscription_delivery();

CREATE FUNCTION public.newsletter_form_campaign(p_day date,p_segment text,p_payload jsonb,p_fingerprint text,tok uuid,p_clock timestamptz DEFAULT now()) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE campaign uuid; state text; BEGIN
 IF NOT EXISTS(SELECT 1 FROM newsletter_settings WHERE singleton AND enabled AND lease_token=tok AND lease_until>now()) THEN RAISE EXCEPTION 'worker_not_authorized'; END IF;
 IF p_day<>(p_clock AT TIME ZONE 'America/Sao_Paulo')::date OR extract(isodow FROM p_day) NOT IN (1,5)
    OR (p_clock AT TIME ZONE 'America/Sao_Paulo')::time NOT BETWEEN time '10:00' AND time '12:00' THEN RAISE EXCEPTION 'outside_window'; END IF;
 SELECT id INTO campaign FROM newsletter_campaigns WHERE edition_day=p_day AND segment=p_segment;
 IF campaign IS NOT NULL THEN RETURN campaign; END IF;
 IF NOT EXISTS(SELECT 1 FROM newsletter_subscriptions WHERE status='interested' AND delivery_enabled AND consent_version='v2' AND suppressed_at IS NULL AND interest=p_segment) THEN RETURN NULL; END IF;
 IF EXISTS(SELECT 1 FROM newsletter_campaigns WHERE segment=p_segment AND status IN ('submitted','sent','submitting','uncertain') AND COALESCE(submitted_at,created_at)>p_clock-interval '72 hours') THEN RETURN NULL; END IF;
 state:='syncing';
 IF p_fingerprint=(SELECT fingerprint FROM newsletter_campaigns WHERE segment=p_segment AND status IN ('submitted','sent') ORDER BY edition_day DESC LIMIT 1) THEN state:='skipped'; END IF;
 INSERT INTO newsletter_campaigns(edition_day,segment,payload,fingerprint,status) VALUES(p_day,p_segment,p_payload,p_fingerprint,state) RETURNING id INTO campaign;
 IF state='skipped' THEN RETURN campaign; END IF;
 INSERT INTO newsletter_recipients(campaign_id,subscription_id,edition_day,consent_at)
 SELECT campaign,s.id,p_day,s.consent_at FROM newsletter_subscriptions s
 WHERE s.status='interested' AND s.delivery_enabled AND s.consent_version='v2' AND s.suppressed_at IS NULL AND s.interest=p_segment
 AND NOT EXISTS(SELECT 1 FROM newsletter_recipients r JOIN newsletter_campaigns c ON c.id=r.campaign_id WHERE r.subscription_id=s.id AND NOT r.excluded
  AND (c.status IN ('submitted','sent','submitting','uncertain') AND COALESCE(c.submitted_at,c.created_at)>p_clock-interval '72 hours'));
 IF NOT FOUND THEN UPDATE newsletter_campaigns SET status='skipped',last_error='no_eligible_recipients' WHERE id=campaign; END IF;
 RETURN campaign;
END $$;

-- Recheck the same consent revision immediately before submission; do not add new recipients.
CREATE FUNCTION public.newsletter_live_recipients(p_campaign uuid) RETURNS TABLE(id uuid,person_name text,email text,resend_contact_id text,consent_at timestamptz,synced boolean) LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT s.id,s.person_name,s.email,s.resend_contact_id,s.consent_at,r.synced FROM newsletter_recipients r JOIN newsletter_subscriptions s ON s.id=r.subscription_id
 WHERE r.campaign_id=p_campaign AND NOT r.excluded AND s.status='interested' AND s.delivery_enabled AND s.consent_version='v2' AND s.suppressed_at IS NULL AND s.consent_at=r.consent_at;
$$;
CREATE FUNCTION public.newsletter_authorize(signature text,issued_at text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE secret bytea; BEGIN
 IF signature IS NULL OR signature!~'^[a-f0-9]{64}$' OR issued_at IS NULL OR issued_at!~'^[0-9]{10}$' THEN RETURN false; END IF;
 IF abs(extract(epoch FROM now())-issued_at::bigint)>300 THEN RETURN false; END IF;
 SELECT signing_key INTO secret FROM newsletter_settings WHERE singleton;
 RETURN signature=encode(extensions.hmac(convert_to(issued_at||':newsletter','UTF8'),secret,'sha256'),'hex');
END $$;
CREATE FUNCTION public.newsletter_dispatch() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE issued text; sig text; settings newsletter_settings; BEGIN
 SELECT * INTO settings FROM newsletter_settings WHERE singleton;
 IF NOT settings.enabled THEN RETURN NULL; END IF;
 issued:=floor(extract(epoch FROM clock_timestamp()))::bigint::text;
 sig:=encode(extensions.hmac(convert_to(issued||':newsletter','UTF8'),settings.signing_key,'sha256'),'hex');
 RETURN net.http_post(url:='https://vitalemobilidade.com/api/public/newsletter-worker',
  headers:=jsonb_build_object('Content-Type','application/json','x-worker-signature',sig,'x-worker-issued-at',issued),body:='{}'::jsonb,timeout_milliseconds:=180000);
END $$;
SELECT cron.schedule('vitale-newsletter','*/5 * * * *',$$SELECT public.newsletter_dispatch();$$);
SELECT cron.alter_job(jobid,active:=false) FROM cron.job WHERE jobname='vitale-newsletter';

CREATE FUNCTION public.newsletter_record_event(p_id text,p_type text,p_emails text[],p_contact text,p_occurred timestamptz,p_broadcast text DEFAULT NULL,p_email_id text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 INSERT INTO newsletter_webhook_events(event_id,event_type,campaign_id,email_id) VALUES(p_id,p_type,(SELECT id FROM newsletter_campaigns WHERE resend_id=p_broadcast),p_email_id) ON CONFLICT DO NOTHING;
 IF NOT FOUND THEN RETURN false; END IF;
 IF p_type IN ('contact.updated','email.complained','email.bounced') THEN
  UPDATE newsletter_subscriptions SET status='unsubscribed',delivery_enabled=false,suppressed_at=now()
  WHERE resend_contact_id IS NOT NULL AND consent_at<=p_occurred
    AND ((p_contact IS NOT NULL AND resend_contact_id=p_contact) OR email=ANY(p_emails));
 END IF;
 IF p_type='email.complained' THEN
  UPDATE newsletter_settings SET enabled=false,last_error='spam_complaint' WHERE singleton;
 END IF;
 RETURN true;
END $$;

CREATE FUNCTION public.newsletter_campaign_report() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 SELECT COALESCE(jsonb_agg(row_to_json(reports)), '[]'::jsonb) FROM (
  SELECT c.id,c.edition_day,c.segment,c.status,c.resend_id,c.last_error,c.created_at,c.submitted_at,c.sent_at,
    (SELECT count(*) FROM newsletter_recipients r WHERE r.campaign_id=c.id AND NOT r.excluded) AS recipients,
    (SELECT count(*) FROM newsletter_webhook_events e WHERE e.campaign_id=c.id AND e.event_type='email.delivered') AS delivered,
    (SELECT count(*) FROM newsletter_webhook_events e WHERE e.campaign_id=c.id AND e.event_type IN ('email.bounced','email.failed')) AS failed
  FROM newsletter_campaigns c ORDER BY c.created_at DESC LIMIT 20
 ) reports;
$$;

-- Only the server can call these private functions, never browser/anon.
DO $$DECLARE proc record; BEGIN
 FOR proc IN SELECT oid::regprocedure AS fn FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname LIKE 'newsletter_%' LOOP
  EXECUTE format('REVOKE ALL ON FUNCTION %s FROM PUBLIC,anon,authenticated',proc.fn);
  EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role',proc.fn);
 END LOOP;
END $$;
REVOKE EXECUTE ON FUNCTION public.newsletter_dispatch() FROM service_role;
COMMIT;
