\set ON_ERROR_STOP on
DO $$
DECLARE a uuid:=gen_random_uuid(); request uuid:=gen_random_uuid(); e price_alert_emails; count_rows integer;
BEGIN
 INSERT INTO bike_price_alerts(id,bike_id,bike_name,person_name,phone_e164,email,condition,target_price,reference_price) VALUES(a,'v9_max','V9 Max','Pessoa Fixture','+5511999990000','pessoa@example.test','target',6000,6500);
 INSERT INTO price_alert_hotpipe_requests VALUES(a,request);
 INSERT INTO price_alert_hotpipe_outbox(alert_id,payload) VALUES(a,jsonb_build_object('operation','upsert','request_id',request));
 IF EXISTS(SELECT 1 FROM price_alert_emails) THEN RAISE EXCEPTION 'gate OFF queued mail'; END IF;
 UPDATE price_alert_email_settings SET enabled=true;
 INSERT INTO price_alert_hotpipe_outbox(alert_id,payload) VALUES(a,jsonb_build_object('operation','upsert','request_id',request));
 INSERT INTO price_alert_hotpipe_outbox(alert_id,payload) VALUES(a,jsonb_build_object('operation','upsert','request_id',request));
 IF (SELECT count(*) FROM price_alert_emails)<>1 THEN RAISE EXCEPTION 'duplicate registration'; END IF;
 SELECT * INTO e FROM claim_price_alert_emails();
 IF e.kind<>'registered' OR (e.payload->>'currentPrice')::numeric<>6250 OR e.delivery_to<>'pessoa@example.test' THEN RAISE EXCEPTION 'bad snapshot'; END IF;
 IF EXISTS(SELECT 1 FROM claim_price_alert_emails()) THEN RAISE EXCEPTION 'claim repeated'; END IF;
 IF prepare_price_alert_email(e.id,e.lease_token,'{"frozen":1}')<>'{"frozen":1}' OR prepare_price_alert_email(e.id,e.lease_token,'{"changed":1}')<>'{"frozen":1}' THEN RAISE EXCEPTION 'body not frozen'; END IF;
 IF finish_price_alert_email(e.id,gen_random_uuid(),'accepted','wrong-provider',NULL) THEN RAISE EXCEPTION 'foreign lease'; END IF;
 PERFORM record_price_alert_email_event('early-receipt','provider-fixture','email.delivered',now(),'vitale@example.test');
 IF NOT finish_price_alert_email(e.id,e.lease_token,'accepted','provider-fixture',NULL) THEN RAISE EXCEPTION 'ack failed'; END IF;
 IF (SELECT status FROM price_alert_emails WHERE provider_id='provider-fixture')<>'delivered' THEN RAISE EXCEPTION 'early receipt lost'; END IF;
 IF EXISTS(SELECT 1 FROM claim_price_alert_emails()) THEN RAISE EXCEPTION 'target not reached'; END IF;
 UPDATE fixture_bikes SET data=jsonb_set(data,'{currentPrice}','5900');
 SELECT * INTO e FROM claim_price_alert_emails();
 IF e.kind<>'price_reached' OR (e.payload->>'currentPrice')::numeric<>5900 THEN RAISE EXCEPTION 'target missed'; END IF;
 UPDATE fixture_bikes SET data=jsonb_set(data,'{currentPrice}','6100');
 IF prepare_price_alert_email(e.id,e.lease_token,'{"price":5900}') IS NOT NULL THEN RAISE EXCEPTION 'post after price recovered'; END IF;
 UPDATE fixture_bikes SET data=jsonb_set(data,'{currentPrice}','5900');
 IF prepare_price_alert_email(e.id,e.lease_token,'{"price":5900}') IS NULL THEN RAISE EXCEPTION 'valid price blocked'; END IF;
 PERFORM finish_price_alert_email(e.id,e.lease_token,'uncertain',NULL,'network');
 IF EXISTS(SELECT 1 FROM claim_price_alert_emails()) THEN RAISE EXCEPTION 'uncertain replayed'; END IF;
 PERFORM record_price_alert_email_event(gen_random_uuid()::text,'provider-fixture','email.delivered',now(),'vitale@example.test');
 PERFORM record_price_alert_email_event(gen_random_uuid()::text,'provider-fixture','email.complained',now(),'vitale@example.test');
 PERFORM record_price_alert_email_event(gen_random_uuid()::text,'provider-fixture','email.delivered',now(),'vitale@example.test');
 IF (SELECT status FROM price_alert_emails WHERE provider_id='provider-fixture')<>'complained' THEN RAISE EXCEPTION 'complaint regressed'; END IF;
 -- Future registration to suppressed mailbox is cancelled before a claim.
 request:=gen_random_uuid();UPDATE price_alert_hotpipe_requests SET request_id=request WHERE alert_id=a;
 INSERT INTO price_alert_hotpipe_outbox(alert_id,payload) VALUES(a,jsonb_build_object('operation','upsert','request_id',request));
 IF EXISTS(SELECT 1 FROM claim_price_alert_emails()) THEN RAISE EXCEPTION 'suppressed recipient'; END IF;
 IF jsonb_array_length(price_alert_metrics()->'daily')<>30 THEN RAISE EXCEPTION 'missing calendar zeroes'; END IF;
 IF has_function_privilege('anon','claim_price_alert_emails()','execute') OR has_table_privilege('authenticated','price_alert_emails','select') THEN RAISE EXCEPTION 'public queue'; END IF;
 RAISE NOTICE 'Vitale assertions passed: gates, dedupe, leases, snapshot, target revalidation, uncertainty, receipts, suppression, calendar, privileges';
END $$;
