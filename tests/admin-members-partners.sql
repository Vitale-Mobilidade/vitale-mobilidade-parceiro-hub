\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
RESET ROLE;
-- Only synthetic fixture identities. No production data, network or sends.
SELECT pg_temp.expect_error($s$SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000091','members','{}')$s$,'forbidden');
SET ROLE authenticated;
SELECT pg_temp.expect_error($s$SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{}')$s$,'permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_listing_courtesies','permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_courtesy_audit','permission denied');
SELECT pg_temp.expect_error('SELECT public.admin_member_summary(auth.uid())','permission denied');
RESET ROLE;
SELECT pg_temp.check_true((public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{"query":"OTHER@EXAMPLE.INVALID"}')->>'total')::int=1,'email search insensitive');
SELECT pg_temp.check_true((public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{"query":"OuTrO"}')->>'total')::int=1,'name search insensitive');
SELECT pg_temp.check_true((public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{"query":"(11) 99999-9998"}')->>'total')::int>=1,'phone search normalized');
SELECT pg_temp.check_true((public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{"query":"%_"}')->>'total')::int=0,'wildcards are literal');
SELECT pg_temp.expect_error($s$SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{"offset":-1}')$s$,'invalid_input');
SELECT pg_temp.check_true(jsonb_array_length(public.admin_community_manage('00000000-0000-4000-8000-000000000001','members','{"offset":100000}')->'items')=0,'page bounds');
SELECT pg_temp.check_true((public.admin_community_manage('00000000-0000-4000-8000-000000000001','member','{"id":"00000000-0000-4000-8000-000000000091"}')->'member'->>'email')='other@example.invalid','member contact and listings available privately');
UPDATE public.member_bike_listings SET status='draft',confirmed_phone='5511999999998',contact_confirmed_at=now() WHERE id IN ('00000000-0000-4000-8000-000000000781','00000000-0000-4000-8000-000000000782');
UPDATE public.member_listing_billing SET status='expired',paid_until=now()-interval '1 day',display_started_at=now()-interval '91 days' WHERE listing_id IN ('00000000-0000-4000-8000-000000000781','00000000-0000-4000-8000-000000000782');
CREATE TEMP TABLE partner_baseline AS SELECT (SELECT count(*) FROM public.member_listing_billing) orders,(SELECT count(*) FROM public.member_operation_alerts WHERE event_kind='paid_listing') notices,(public.admin_member_metrics('00000000-0000-4000-8000-000000000001',30)->>'grossCents')::bigint gross;
SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','grant','{"userId":"00000000-0000-4000-8000-000000000091","requestId":"00000000-0000-4000-8000-000000000881","quantity":1,"reason":"Parceria sintética"}');
SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','grant','{"userId":"00000000-0000-4000-8000-000000000091","requestId":"00000000-0000-4000-8000-000000000881","quantity":1,"reason":"Parceria sintética"}');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_listing_courtesies WHERE request_id='00000000-0000-4000-8000-000000000881'),'grant retry idempotent');
SELECT pg_temp.expect_error($s$SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','grant','{"userId":"00000000-0000-4000-8000-000000000091","requestId":"00000000-0000-4000-8000-000000000881","quantity":2,"reason":"Parceria sintética"}')$s$,'request_conflict');
SELECT pg_temp.expect_error($s$SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','grant','{"userId":"00000000-0000-4000-8000-000000000091","requestId":"00000000-0000-4000-8000-000000000883","quantity":11,"reason":"Parceria sintética"}')$s$,'invalid_input');
UPDATE public.member_profiles SET suspended=true WHERE user_id='00000000-0000-4000-8000-000000000091';
SELECT pg_temp.expect_error($s$SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','grant','{"userId":"00000000-0000-4000-8000-000000000091","requestId":"00000000-0000-4000-8000-000000000883","quantity":1,"reason":"Parceria sintética"}')$s$,'invalid_input');
UPDATE public.member_profiles SET suspended=false WHERE user_id='00000000-0000-4000-8000-000000000091';
SELECT id::text AS courtesy_id FROM public.member_listing_courtesies WHERE request_id='00000000-0000-4000-8000-000000000881' \gset
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT pg_temp.check_true((public.member_classifieds('periods','{"id":"00000000-0000-4000-8000-000000000781"}')->0->>'kind')='courtesy','seller sees courtesy without fake payment');
SELECT public.member_classifieds('claim_period',jsonb_build_object('id','00000000-0000-4000-8000-000000000781','orderId',:'courtesy_id'));
RESET ROLE;
SELECT pg_temp.check_true((SELECT started_at IS NULL FROM public.member_listing_courtesies WHERE id=:'courtesy_id'),'assigning a courtesy does not start its clock');
UPDATE public.member_identity_verifications SET phone_verified_at=NULL WHERE user_id='00000000-0000-4000-8000-000000000091';
SET ROLE authenticated;
SELECT pg_temp.expect_error($s$SELECT public.member_classifieds('publish','{"id":"00000000-0000-4000-8000-000000000781","contactConsent":true}')$s$,'listing_phone_confirmation');
RESET ROLE;
UPDATE public.member_identity_verifications SET phone_verified_at=now() WHERE user_id='00000000-0000-4000-8000-000000000091';
SET ROLE authenticated;
SELECT pg_temp.expect_error($s$SELECT public.member_classifieds('publish','{"id":"00000000-0000-4000-8000-000000000781","contactConsent":false}')$s$,'listing_contact_consent');
SELECT public.member_classifieds('publish','{"id":"00000000-0000-4000-8000-000000000781","contactConsent":true}');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','claim_period',jsonb_build_object('id','00000000-0000-4000-8000-000000000782','orderId',:'courtesy_id')),'period_in_use');
RESET ROLE;
SELECT pg_temp.expect_error($s$SELECT public.member_claim_period('00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000781','00000000-0000-4000-8000-000000000897')$s$,'period_already_assigned');
SELECT expires_at::text AS courtesy_deadline FROM public.member_listing_courtesies WHERE id=:'courtesy_id' \gset
SELECT pg_temp.check_true((SELECT started_at IS NOT NULL AND expires_at=started_at+interval '2160 hours' FROM public.member_listing_courtesies WHERE id=:'courtesy_id'),'90 days starts on first publication');
SELECT pg_temp.check_true((public.member_bike_listings_public('00000000-0000-4000-8000-000000000781')->>'total')::int=1,'courtesy listing visible publicly');
SELECT pg_temp.check_true((SELECT notices=(SELECT count(*) FROM public.member_operation_alerts WHERE event_kind='paid_listing') AND orders=(SELECT count(*) FROM public.member_listing_billing) AND gross=(public.admin_member_metrics('00000000-0000-4000-8000-000000000001',30)->>'grossCents')::bigint FROM partner_baseline),'no fake revenue, order or paid alert');
SET ROLE authenticated;
SELECT public.member_classifieds('archive','{"id":"00000000-0000-4000-8000-000000000781"}');
SELECT public.member_classifieds('withdraw','{"id":"00000000-0000-4000-8000-000000000781"}');
SELECT public.member_classifieds('publish','{"id":"00000000-0000-4000-8000-000000000781","contactConsent":true}');
SELECT public.member_classifieds('archive','{"id":"00000000-0000-4000-8000-000000000781"}');
SELECT public.member_classifieds('claim_period',jsonb_build_object('id','00000000-0000-4000-8000-000000000782','orderId',:'courtesy_id'));
SELECT public.member_classifieds('publish','{"id":"00000000-0000-4000-8000-000000000782","contactConsent":true}');
RESET ROLE;
SELECT pg_temp.check_true((SELECT expires_at=:'courtesy_deadline'::timestamptz AND listing_id='00000000-0000-4000-8000-000000000782' FROM public.member_listing_courtesies WHERE id=:'courtesy_id'),'reactivation and transfer preserve deadline');
SELECT pg_temp.expect_error($s$SELECT public.member_billing_purchase('00000000-0000-4000-8000-000000000091','00000000-0000-4000-8000-000000000782',true,true)$s$,'courtesy_available');
-- Revocation needs an explicit reason, withdraws covered ad, and cannot erase the grant.
SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','revoke',jsonb_build_object('userId','00000000-0000-4000-8000-000000000091','courtesyId',:'courtesy_id','reason','Fim da parceria sintética'));
SELECT pg_temp.check_true((SELECT status='draft' FROM public.member_bike_listings WHERE id='00000000-0000-4000-8000-000000000782') AND NOT public.member_listing_entitled('00000000-0000-4000-8000-000000000782'),'revoke removes publication and benefit');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM public.member_courtesy_audit WHERE courtesy_id=:'courtesy_id'),'grant, both claims and revoke audited');
SELECT pg_temp.check_true((public.admin_community_manage('00000000-0000-4000-8000-000000000001','listings','{"status":"archived"}')->>'total')::int>=1,'all statuses in admin directory');
-- Expiry cannot keep a listing public; owner cannot steal another benefit.
SELECT public.admin_community_manage('00000000-0000-4000-8000-000000000001','grant','{"userId":"00000000-0000-4000-8000-000000000091","requestId":"00000000-0000-4000-8000-000000000882","quantity":1,"reason":"Parceria para expiração"}');
SELECT id::text AS expiring_id FROM public.member_listing_courtesies WHERE request_id='00000000-0000-4000-8000-000000000882' \gset
SET ROLE authenticated;
SELECT public.member_classifieds('claim_period',jsonb_build_object('id','00000000-0000-4000-8000-000000000782','orderId',:'expiring_id'));
SELECT public.member_classifieds('publish','{"id":"00000000-0000-4000-8000-000000000782","contactConsent":true}');
RESET ROLE;
UPDATE public.member_listing_courtesies SET started_at=now()-interval '91 days',expires_at=now()-interval '1 day' WHERE id=:'expiring_id';
SELECT pg_temp.check_true((public.member_bike_listings_public('00000000-0000-4000-8000-000000000782')->>'total')::int=0,'expiry hides public listing immediately');
SELECT public.member_billing_expire_periods();
SELECT pg_temp.check_true((SELECT status='draft' FROM public.member_bike_listings WHERE id='00000000-0000-4000-8000-000000000782'),'worker expires courtesy publication');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','claim_period',jsonb_build_object('id','00000000-0000-4000-8000-000000000782','orderId',:'expiring_id')),'listing_unavailable');
RESET ROLE;
