\set ON_ERROR_STOP on
RESET ROLE;
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.member_operation_alerts),'no historical alerts or mail sent on migration');
SELECT pg_temp.check_true(NOT has_table_privilege('anon','public.member_operation_alerts','SELECT') AND NOT has_table_privilege('authenticated','public.member_operation_alert_settings','UPDATE'),'queue and destination private despite broad defaults');
SELECT pg_temp.check_true(NOT has_function_privilege('authenticated','public.member_operation_alert_claim()','EXECUTE') AND NOT has_function_privilege('anon','public.member_operation_alert_finish(uuid,uuid,text,text)','EXECUTE'),'queue RPC backend only');
SELECT pg_temp.check_true(NOT has_function_privilege('authenticated','public.member_operation_alert_prepare(uuid,uuid,text)','EXECUTE'),'prepare backend only');
UPDATE public.member_operation_alert_settings SET enabled=true,recipient='owner@example.invalid',starts_at=now()-interval '1 second';
INSERT INTO auth.users(id,email,is_anonymous) VALUES('00000000-0000-4000-8000-000000000891','new@example.invalid',false),('00000000-0000-4000-8000-000000000892',NULL,true),('00000000-0000-4000-8000-000000000893','old@example.invalid',false),('00000000-0000-4000-8000-000000000894','rollback@example.invalid',false);
INSERT INTO public.member_profiles(user_id,display_name) VALUES('00000000-0000-4000-8000-000000000891','Pessoa nova');
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.member_operation_alerts),'partial account is not completed registration');
UPDATE public.member_profiles SET community_joined_at=now() WHERE user_id='00000000-0000-4000-8000-000000000891';
UPDATE public.member_profiles SET display_name='Nome atualizado' WHERE user_id='00000000-0000-4000-8000-000000000891';
UPDATE public.member_profiles SET community_joined_at=NULL WHERE user_id='00000000-0000-4000-8000-000000000891';
UPDATE public.member_profiles SET community_joined_at=now() WHERE user_id='00000000-0000-4000-8000-000000000891';
INSERT INTO public.member_profiles(user_id,display_name,community_joined_at) VALUES('00000000-0000-4000-8000-000000000892','Anônimo',now()),('00000000-0000-4000-8000-000000000893','Antigo',now()-interval '2 days');
SELECT pg_temp.check_true((SELECT count(*)=1 AND min(payload->>'name')='Pessoa nova' FROM public.member_operation_alerts WHERE event_kind='registration'),'one immutable event on first real completed signup, no history/anonymous');
BEGIN;
INSERT INTO public.member_profiles(user_id,display_name,community_joined_at) VALUES('00000000-0000-4000-8000-000000000894','Rollback',now());
ROLLBACK;
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts),'rollback registration also rolls back queue');

-- Payment alone is not publication; reuse/repeated webhooks do not mean new payment.
SELECT id AS order_id,listing_id AS source_id FROM public.member_listing_billing WHERE user_id='00000000-0000-4000-8000-000000000091' LIMIT 1 \gset
UPDATE public.member_listing_payment_cycles SET paid=true,status='CONFIRMED' WHERE order_id=:'order_id';
UPDATE public.member_bike_listings l SET confirmed_phone=replace(v.phone_number,'+',''),contact_confirmed_at=now(),contact_consent_at=now() FROM public.member_identity_verifications v WHERE l.id=:'source_id' AND v.user_id=l.user_id;
UPDATE public.member_listing_billing SET status='active',hold=false,paid_at=now()-interval '2 days',paid_until=now()+interval '40 days' WHERE id=:'order_id';
UPDATE public.member_bike_listings SET status='published' WHERE id=:'source_id';
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'old paid periods do not generate historical alerts on reactivation');
UPDATE public.member_bike_listings SET status='draft' WHERE id=:'source_id';
UPDATE public.member_listing_billing SET paid_at=now() WHERE id=:'order_id';
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'provider payment alone is not notification of published ad');
UPDATE public.member_bike_listings SET status='published' WHERE id=:'source_id';
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'first verified paid publication queues once');
UPDATE public.member_bike_listings SET status='published' WHERE id=:'source_id';
UPDATE public.member_bike_listings SET status='archived' WHERE id=:'source_id';
UPDATE public.member_bike_listings SET status='published' WHERE id=:'source_id';
SELECT public.member_billing_recalculate(:'order_id');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'reactivation and reconciliation not duplicate payment notice');
UPDATE public.member_bike_listings SET status='archived' WHERE id=:'source_id';
INSERT INTO public.member_bike_listings(id,user_id,title,confirmed_phone,contact_confirmed_at,contact_consent_at)
SELECT '00000000-0000-4000-8000-000000000899',user_id,'Outra bike',confirmed_phone,contact_confirmed_at,now() FROM public.member_bike_listings WHERE id=:'source_id';
SELECT public.member_claim_period('00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000899',:'order_id');
UPDATE public.member_bike_listings SET status='published' WHERE id='00000000-0000-4000-8000-000000000899';
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'reassigned bike uses same paid period and notice identity');
UPDATE public.member_listing_payment_cycles SET paid=false,status='REFUNDED' WHERE order_id=:'order_id';
SELECT public.member_billing_recalculate(:'order_id');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'refund does not generate another successful payment notice');
INSERT INTO public.member_bike_listings(id,user_id,seller_kind,title) VALUES('00000000-0000-4000-8000-000000000898','00000000-0000-4000-8000-000000000001','channel','Canal sem pagamento');
UPDATE public.member_bike_listings SET status='published' WHERE id='00000000-0000-4000-8000-000000000898';
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'Admin channel not mistaken for paid customer');

-- Lease/token prevents acknowledgements by a stale worker; accepted mail stays sent.
CREATE TEMP TABLE first_claim AS SELECT * FROM public.member_operation_alert_claim();
SELECT pg_temp.check_true((SELECT count(*)=2 FROM first_claim),'bounded worker batch');
SELECT pg_temp.check_true(public.member_operation_alert_prepare(id,lease_token,jsonb_build_object('from',delivery_from,'to',jsonb_build_array(delivery_to),'subject','Primeiro','text','Primeiro','html','Primeiro')::text)::jsonb->>'text'='Primeiro','freeze exact body before send') FROM first_claim;
SELECT pg_temp.check_true(public.member_operation_alert_prepare(id,lease_token,'{}')::jsonb->>'text'='Primeiro','template/config changes cannot mutate already prepared body') FROM first_claim;
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.member_operation_alert_claim()),'leased rows not reclaimed');
SELECT pg_temp.check_true(NOT public.member_operation_alert_finish(id,gen_random_uuid(),'provider-test',NULL),'stale token rejected') FROM first_claim LIMIT 1;
SELECT pg_temp.check_true(public.member_operation_alert_finish(id,lease_token,'provider-test',NULL),'accepted ack') FROM first_claim WHERE event_kind='registration';
SELECT pg_temp.check_true(NOT public.member_operation_alert_finish(id,lease_token,'provider-test',NULL),'sent is final') FROM first_claim WHERE event_kind='registration';
SELECT pg_temp.check_true(public.member_operation_alert_finish(id,lease_token,NULL,'delivery_retry'),'ambiguous delivery retained') FROM first_claim WHERE event_kind='paid_listing';
UPDATE public.member_operation_alert_settings SET recipient='changed@example.invalid';
UPDATE public.newsletter_settings SET from_email='Other <sender@example.invalid>';
UPDATE public.member_operation_alerts SET available_at=now()-interval '1 minute' WHERE status='pending';
CREATE TEMP TABLE second_claim AS SELECT * FROM public.member_operation_alert_claim();
SELECT pg_temp.check_true((SELECT count(*)=1 AND bool_and(delivery_to='owner@example.invalid' AND delivery_from<>'Other <sender@example.invalid>') FROM second_claim),'retry freezes original destination sender and payload');
UPDATE public.member_operation_alerts SET first_attempt_at=now()-interval '24 hours',lease_until=now()-interval '1 minute' WHERE status='sending';
SELECT pg_temp.check_true((SELECT count(*)=0 FROM public.member_operation_alert_claim()),'outside idempotency window never resent');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_operation_alerts WHERE status='needs_review' AND error_code='delivery_window_elapsed'),'uncertain old mail flagged for review');
SELECT pg_temp.check_true((SELECT bool_and(NOT (payload ? 'email') AND NOT (payload ? 'phone')) FROM public.member_operation_alerts),'notification payload contains no private email or phone');
-- A different real purchase must still produce its own notice after first publication.
INSERT INTO public.member_bike_listings(id,user_id,title,confirmed_phone,contact_confirmed_at,contact_consent_at)
SELECT '00000000-0000-4000-8000-000000000897',user_id,'Nova compra',confirmed_phone,contact_confirmed_at,now() FROM public.member_bike_listings WHERE id='00000000-0000-4000-8000-000000000899';
INSERT INTO public.member_listing_billing(id,user_id,listing_id,method,status,listing_revision,contact_consent_at,monthly_accepted_at,paid_at)
VALUES('00000000-0000-4000-8000-000000000897','00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000897','hosted','active',now(),now(),now(),now());
INSERT INTO public.member_listing_payment_cycles(payment_id,order_id,status,paid,due_date,period_end)
VALUES('synthetic_new_purchase','00000000-0000-4000-8000-000000000897','CONFIRMED',true,current_date,now()+interval '90 days');
UPDATE public.member_bike_listings SET status='published' WHERE id='00000000-0000-4000-8000-000000000897';
SELECT pg_temp.check_true((SELECT count(*)=2 FROM public.member_operation_alerts WHERE event_kind='paid_listing'),'each distinct paid publication has its own notice');
SELECT pg_temp.check_true((SELECT payload->>'paidUntil' IS NOT NULL FROM public.member_operation_alerts WHERE source_id='00000000-0000-4000-8000-000000000897'),'automatic first-publication expiry captured');
UPDATE public.member_operation_alerts SET status='sent' WHERE source_id='00000000-0000-4000-8000-000000000897';

-- Leave fresh synthetic rows for parallel claim test.
INSERT INTO public.member_operation_alerts(event_kind,source_id,payload)
SELECT 'registration',gen_random_uuid(),jsonb_build_object('name','Concorrência','occurredAt',now()) FROM generate_series(1,4);
