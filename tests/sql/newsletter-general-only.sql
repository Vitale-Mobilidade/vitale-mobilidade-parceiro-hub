\set ON_ERROR_STOP on
CREATE TABLE newsletter_settings(singleton boolean,enabled boolean,lease_token uuid,lease_until timestamptz);
CREATE TABLE newsletter_campaigns(id uuid DEFAULT gen_random_uuid(),edition_day date,segment text,payload jsonb,fingerprint text,status text,submitted_at timestamptz,created_at timestamptz DEFAULT now(),last_error text);
CREATE TABLE newsletter_subscriptions(id uuid DEFAULT gen_random_uuid(),status text DEFAULT 'interested',delivery_enabled boolean DEFAULT true,consent_version text DEFAULT 'v2',suppressed_at timestamptz,interest text,consent_at timestamptz DEFAULT now());
CREATE TABLE newsletter_recipients(campaign_id uuid,subscription_id uuid,edition_day date,consent_at timestamptz,excluded boolean DEFAULT false);
\i supabase/migrations/20261019160000_newsletter_general_only.sql
INSERT INTO newsletter_settings VALUES(true,true,'00000000-0000-0000-0000-000000000001',now()+interval '1 hour');
INSERT INTO newsletter_subscriptions(interest) VALUES('general'),('radar'),('content');
INSERT INTO newsletter_subscriptions(interest,status) VALUES('radar','unsubscribed');
INSERT INTO newsletter_subscriptions(interest,delivery_enabled) VALUES('radar',false);
INSERT INTO newsletter_subscriptions(interest,consent_version) VALUES('radar','v1');
INSERT INTO newsletter_subscriptions(interest,suppressed_at) VALUES('radar',now());
DO $$ DECLARE c uuid; again uuid; BEGIN
 c:=newsletter_form_campaign('2026-10-21','general','{}','fingerprint','00000000-0000-0000-0000-000000000001','2026-10-21T09:30:00Z');
 IF (SELECT count(*) FROM newsletter_recipients WHERE campaign_id=c)<>3 THEN RAISE EXCEPTION 'audience_filters_failed'; END IF;
 again:=newsletter_form_campaign('2026-10-21','general','{}','other','00000000-0000-0000-0000-000000000001','2026-10-21T09:30:00Z');
 IF c IS DISTINCT FROM again OR (SELECT count(*) FROM newsletter_campaigns)<>1 THEN RAISE EXCEPTION 'idempotency_failed'; END IF;
 IF newsletter_form_campaign('2026-10-21','radar','{}','x','00000000-0000-0000-0000-000000000001','2026-10-21T09:30:00Z') IS NOT NULL THEN RAISE EXCEPTION 'legacy_allowed'; END IF;
END $$;
TRUNCATE newsletter_campaigns,newsletter_recipients;
INSERT INTO newsletter_campaigns(edition_day,segment,status) VALUES('2026-10-21','radar','sent');
DO $$ BEGIN
 PERFORM newsletter_form_campaign('2026-10-21','general','{}','x','00000000-0000-0000-0000-000000000001','2026-10-21T09:30:00Z');
 IF (SELECT count(*) FROM newsletter_campaigns)<>1 THEN RAISE EXCEPTION 'historical_edition_resent'; END IF;
END $$;
TRUNCATE newsletter_campaigns,newsletter_recipients;
INSERT INTO newsletter_campaigns(edition_day,segment,status,submitted_at) VALUES('2026-10-19','radar','sent','2026-10-20T12:00:00Z');
DO $$ BEGIN
 IF newsletter_form_campaign('2026-10-21','general','{}','x','00000000-0000-0000-0000-000000000001','2026-10-21T09:30:00Z') IS NOT NULL THEN RAISE EXCEPTION 'cooldown_failed'; END IF;
END $$;
