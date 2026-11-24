UPDATE price_alert_email_settings SET enabled=true;
-- Suppressed destination, new registration, uncertain price notice.
INSERT INTO price_alert_emails(alert_id,request_id,kind,delivery_to,status)
SELECT a.id,h.request_id,CASE WHEN a.email='person8@example.test' THEN 'price_reached' ELSE 'registered' END,a.email,
CASE a.email WHEN 'person6@example.test' THEN 'bounced' WHEN 'person8@example.test' THEN 'uncertain' ELSE 'delivered' END
FROM bike_price_alerts a JOIN price_alert_hotpipe_requests h ON h.alert_id=a.id WHERE a.email IN ('person6@example.test','person7@example.test','person8@example.test');
CREATE TEMP TABLE first_claim AS SELECT * FROM claim_price_alert_emails();
DO $$BEGIN
 IF (SELECT count(*) FROM price_alert_emails WHERE kind='price_reached')<>3 THEN RAISE EXCEPTION 'legacy and new monitoring, suppression, target and consent'; END IF;
 IF NOT EXISTS(SELECT 1 FROM price_alert_emails e JOIN bike_price_alerts a ON a.id=e.alert_id WHERE a.email='person1@example.test' AND e.kind='price_reached') THEN RAISE EXCEPTION 'legacy missing'; END IF;
 IF EXISTS(SELECT 1 FROM price_alert_emails e JOIN bike_price_alerts a ON a.id=e.alert_id WHERE a.email='person1@example.test' AND e.kind='registered') THEN RAISE EXCEPTION 'fake registration'; END IF;
 IF (SELECT count(*) FROM first_claim)<>2 THEN RAISE EXCEPTION 'bounded claim'; END IF;
END $$;
-- Separate authorized update for a target that has not been reached.
INSERT INTO price_alert_emails(alert_id,request_id,kind,delivery_to,payload)
SELECT a.id,h.request_id,'price_update',a.email,jsonb_build_object('currentPrice',6174,'link','https://meli.la/FixtureOnly') FROM bike_price_alerts a JOIN price_alert_hotpipe_requests h ON h.alert_id=a.id WHERE a.email='person2@example.test';
CREATE TEMP TABLE manual_claim AS SELECT * FROM claim_price_alert_emails();
DO $$DECLARE r record; v text; BEGIN
 IF (SELECT count(*) FROM manual_claim)<>1 THEN RAISE EXCEPTION 'no duplicate claim'; END IF;
 SELECT * INTO r FROM manual_claim;
 IF prepare_price_alert_email(r.id,gen_random_uuid(),'bad') IS NOT NULL THEN RAISE EXCEPTION 'wrong lease accepted'; END IF;
 v:=prepare_price_alert_email(r.id,r.lease_token,'immutable-body');
 IF v<>'immutable-body' THEN RAISE EXCEPTION 'manual target blocked'; END IF;
 IF prepare_price_alert_email(r.id,r.lease_token,'changed-body')<>'immutable-body' THEN RAISE EXCEPTION 'body mutated'; END IF;
 UPDATE fixture_offers SET price=6200;
 IF prepare_price_alert_email(r.id,r.lease_token,'same') IS NOT NULL THEN RAISE EXCEPTION 'stale offer accepted'; END IF;
 UPDATE fixture_offers SET price=6174;
 UPDATE bike_price_alerts SET status='cancelled' WHERE id=r.alert_id;
 IF prepare_price_alert_email(r.id,r.lease_token,'same') IS NOT NULL THEN RAISE EXCEPTION 'cancelled accepted'; END IF;
 UPDATE bike_price_alerts SET status='active' WHERE id=r.alert_id;
 INSERT INTO price_alert_emails(alert_id,request_id,kind,delivery_to,status) VALUES(r.alert_id,gen_random_uuid(),'registered',upper(r.delivery_to),'complained');
 IF prepare_price_alert_email(r.id,r.lease_token,'same') IS NOT NULL THEN RAISE EXCEPTION 'late complaint ignored'; END IF;
END $$;
DO $$BEGIN
 IF has_function_privilege('anon','claim_price_alert_emails()','execute') THEN RAISE EXCEPTION 'public claim'; END IF;
 IF has_table_privilege('authenticated','price_alert_emails','select') THEN RAISE EXCEPTION 'public email access'; END IF;
END $$;
SELECT 'Pass: legacy/new, target, no email, consent, cancellation, suppression, uncertain, bounded/deduplicated claim, manual notice, lease, immutable body, stale offer, late complaint and private access' AS result;

DO $$DECLARE issued text; signature text; BEGIN
 issued:=floor(extract(epoch from now()))::bigint::text;
 SELECT encode(extensions.hmac(convert_to(issued||':price-alert-hotpipe','UTF8'),signing_key,'sha256'),'hex') INTO signature FROM price_alert_hotpipe_settings;
 IF NOT authorize_price_alert_hotpipe(signature,issued) THEN RAISE EXCEPTION 'email depends on WhatsApp gate'; END IF;
 IF authorize_price_alert_hotpipe(repeat('0',64),issued) THEN RAISE EXCEPTION 'invalid HMAC authorized'; END IF;
 IF dispatch_price_alert_hotpipe()<>99 THEN RAISE EXCEPTION 'email tick disabled'; END IF;
 INSERT INTO price_alert_hotpipe_outbox(alert_id,payload) VALUES(gen_random_uuid(),'{"operation":"cancel"}');
 IF EXISTS(SELECT 1 FROM claim_price_alert_hotpipe()) THEN RAISE EXCEPTION 'WhatsApp gate ignored'; END IF;
 UPDATE price_alert_hotpipe_settings SET enabled=true;
 IF NOT EXISTS(SELECT 1 FROM claim_price_alert_hotpipe()) THEN RAISE EXCEPTION 'WhatsApp gate did not resume'; END IF;
 UPDATE price_alert_hotpipe_settings SET enabled=false;
 UPDATE price_alert_email_settings SET enabled=false;
 IF authorize_price_alert_hotpipe(signature,issued) OR dispatch_price_alert_hotpipe() IS NOT NULL THEN RAISE EXCEPTION 'both gates disabled'; END IF;
END $$;
SELECT 'Pass: independent gates, valid HMAC, rejected signature, paused WhatsApp does not claim, durable tick and full pause' AS result;
