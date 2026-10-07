DO $$ BEGIN
 IF (SELECT enabled FROM newsletter_settings) THEN RAISE EXCEPTION 'enabled_by_migration'; END IF;
 IF (SELECT active FROM cron.job WHERE jobname='vitale-newsletter') THEN RAISE EXCEPTION 'cron_active_by_migration'; END IF;
END $$;
INSERT INTO editorial_admin_memberships VALUES('00000000-0000-0000-0000-000000000001','admin',true);
INSERT INTO newsletter_subscriptions(person_name,email,consent_text,consent_version) VALUES('Mock V2','v2@example.com','mock','v2'),('Mock V1','v1@example.com','mock','v1');
SELECT newsletter_set_enabled(true,'00000000-0000-0000-0000-000000000001');
DO $$DECLARE tok uuid; campaign uuid; second uuid; invalid boolean:=false; BEGIN
 IF NOT (SELECT delivery_enabled FROM newsletter_subscriptions WHERE email='v2@example.com') THEN RAISE EXCEPTION 'v2_not_enabled'; END IF;
 IF (SELECT delivery_enabled FROM newsletter_subscriptions WHERE email='v1@example.com') THEN RAISE EXCEPTION 'v1_enabled_without_reconsent'; END IF;
 tok:=newsletter_acquire();
 IF tok IS NULL OR newsletter_acquire() IS NOT NULL THEN RAISE EXCEPTION 'overlapping_worker'; END IF;
 BEGIN PERFORM newsletter_form_campaign('2026-10-07','general','{}','initial',tok,'2026-10-07T13:00:00Z'); EXCEPTION WHEN OTHERS THEN invalid:=SQLERRM='outside_window'; END;
 IF NOT invalid THEN RAISE EXCEPTION 'wednesday_send_allowed'; END IF;
 campaign:=newsletter_form_campaign('2026-10-09','general','{}','initial',tok,'2026-10-09T13:00:00Z');
 IF campaign IS NULL OR (SELECT count(*) FROM newsletter_recipients WHERE campaign_id=campaign)<>1 THEN RAISE EXCEPTION 'wrong_cohort'; END IF;
 IF newsletter_form_campaign('2026-10-09','general','{}','changed',tok,'2026-10-09T13:00:00Z')<>campaign THEN RAISE EXCEPTION 'duplicate_edition'; END IF;
 UPDATE newsletter_subscriptions SET consent_at=consent_at+interval '1 second' WHERE email='v2@example.com';
 IF EXISTS(SELECT 1 FROM newsletter_live_recipients(campaign)) THEN RAISE EXCEPTION 'stale_consent_not_removed'; END IF;
 UPDATE newsletter_recipients SET consent_at=(SELECT consent_at FROM newsletter_subscriptions WHERE email='v2@example.com') WHERE campaign_id=campaign;
 UPDATE newsletter_campaigns SET status='submitted',submitted_at='2026-10-09T13:07:00Z' WHERE id=campaign;
 IF newsletter_form_campaign('2026-10-12','general','{}','next',tok,'2026-10-12T13:00:00Z') IS NOT NULL THEN RAISE EXCEPTION 'breathing_interval_not_respected'; END IF;
 second:=newsletter_form_campaign('2026-10-12','general','{}','initial',tok,'2026-10-12T13:10:00Z');
 IF (SELECT status FROM newsletter_campaigns WHERE id=second)<>'skipped' THEN RAISE EXCEPTION 'identical_content_resent'; END IF;
 PERFORM newsletter_release(tok);
 IF (SELECT lease_token FROM newsletter_settings) IS NOT NULL THEN RAISE EXCEPTION 'lease_not_released'; END IF;
END $$;
UPDATE newsletter_subscriptions SET resend_contact_id='00000000-0000-0000-0000-000000000002' WHERE email='v2@example.com';
DO $$BEGIN
 IF NOT newsletter_record_event('event','contact.updated','{}','00000000-0000-0000-0000-000000000002',now()+interval '2 seconds') THEN RAISE EXCEPTION 'webhook_not_recorded'; END IF;
 IF newsletter_record_event('event','contact.updated','{}','00000000-0000-0000-0000-000000000002',now()+interval '2 seconds') THEN RAISE EXCEPTION 'webhook_replay'; END IF;
 IF (SELECT status FROM newsletter_subscriptions WHERE email='v2@example.com')<>'unsubscribed' THEN RAISE EXCEPTION 'optout_not_applied'; END IF;
END $$;
SELECT newsletter_set_enabled(false,'00000000-0000-0000-0000-000000000001');
DO $$BEGIN IF (SELECT active FROM cron.job WHERE jobname='vitale-newsletter') THEN RAISE EXCEPTION 'cron_not_paused'; END IF; END $$;
BEGIN;
INSERT INTO newsletter_campaigns(edition_day,segment,payload,fingerprint) VALUES('2026-10-16','radar','{}','rollback');
ROLLBACK;
DO $$BEGIN IF EXISTS(SELECT 1 FROM newsletter_campaigns WHERE fingerprint='rollback') THEN RAISE EXCEPTION 'nontransactional_ledger'; END IF; END $$;
SET ROLE anon;
DO $$BEGIN
 BEGIN PERFORM * FROM newsletter_settings; RAISE EXCEPTION 'public_settings'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
 BEGIN PERFORM newsletter_acquire(); RAISE EXCEPTION 'public_worker_claim'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
