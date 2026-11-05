\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
SELECT pg_temp.check_true((public.member_bike_listings_public()->>'total')::int=0,'disabled initial projection empty');
-- Synthetic members only. No provider, email, WhatsApp or production data.
UPDATE public.member_billing_settings SET enabled=true,provider_ready=true,purchase_ready=true;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT pg_temp.check_true((public.member_classifieds('account')->>'canAdvertise')::boolean,'ordinary joined member can advertise');
SELECT pg_temp.check_true(NOT (public.member_classifieds('account')->>'canPublish')::boolean,'unverified member cannot publish');
SELECT public.member_classifieds('create')->>'id' AS public_listing_id \gset
SELECT pg_temp.check_true(public.member_classifieds('mine')->0->>'feeStatus'='required','ordinary member pays standard fee');
SELECT public.member_classifieds('save',jsonb_build_object('id',:'public_listing_id','title','Bike de membro comum','brand','Marca','model','Modelo','priceCents',350000,'city','São Paulo','state','SP','mileageKm',120,'condition','good','battery','unknown','invoice',false,'description','Descrição realista de uma bike de teste inteiramente sintética.'));
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','publish',jsonb_build_object('id',:'public_listing_id','contactConsent',true)),'identity_verification_required');
SELECT public.member_classifieds('reserve_image',jsonb_build_object('id',:'public_listing_id')) AS public_asset \gset
SELECT :'public_asset'::jsonb->>'id' AS public_asset_id,:'public_asset'::jsonb->>'path' AS public_asset_path \gset
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('member-media',:'public_asset_path','{"size":1024,"mimetype":"image/webp"}');
SELECT public.member_classifieds('finalize_image',jsonb_build_object('id',:'public_listing_id','assetId',:'public_asset_id'));
SELECT pg_temp.expect_error('UPDATE public.member_classifieds_settings SET public_enabled=true','permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_listing_billing','permission denied');
SELECT pg_temp.expect_error($q$SELECT public.member_billing_purchase('00000000-0000-4000-8000-000000000091',gen_random_uuid(),true,true)$q$,'permission denied');
RESET ROLE;
INSERT INTO public.member_identity_verifications(user_id,email_address,email_verified_at,phone_number,phone_verified_at)
VALUES('00000000-0000-4000-8000-000000000091','other@example.invalid',now(),'+5511999999998',now());
SET ROLE authenticated;
SELECT pg_temp.check_true((public.member_classifieds('account')->>'canPublish')::boolean,'verified ordinary member identity accepted');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','publish',jsonb_build_object('id',:'public_listing_id','contactConsent',true)),'billing_required');
RESET ROLE;
SELECT public.member_billing_purchase('00000000-0000-4000-8000-000000000091',:'public_listing_id',true,true)->>'id' AS public_order_id \gset
SELECT pg_temp.check_true((SELECT amount_cents=15000 AND display_days=90 AND billing_model='one_time_90d' AND paid_at IS NULL FROM public.member_listing_billing WHERE id=:'public_order_id'),'standard one-time purchase reserved without marking paid');
-- Simulate an authoritative paid source inside the disposable database only.
INSERT INTO public.member_listing_payment_cycles(payment_id,order_id,status,paid,due_date,period_end)
VALUES('synthetic_launch_payment',:'public_order_id','RECEIVED',true,current_date,NULL);
UPDATE public.member_listing_billing SET status='active',paid_at=now() WHERE id=:'public_order_id';
SET ROLE authenticated;
SELECT public.member_classifieds('publish',jsonb_build_object('id',:'public_listing_id','contactConsent',true));
RESET ROLE;
SELECT pg_temp.check_true((SELECT status='published' FROM public.member_bike_listings WHERE id=:'public_listing_id'),'ordinary paid member can publish');
SELECT pg_temp.check_true((SELECT paid_until-display_started_at=interval '2160 hours' FROM public.member_listing_billing WHERE id=:'public_order_id'),'90 day display window preserved');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','save',jsonb_build_object('id',:'public_listing_id')),'listing_unavailable');
RESET ROLE;
UPDATE public.member_profiles SET suspended=true WHERE user_id='00000000-0000-4000-8000-000000000091';
SELECT pg_temp.check_true(NOT public.member_classifieds_pilot('00000000-0000-4000-8000-000000000091'),'suspended member denied public gate');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.member_classifieds('create')$q$,'account_suspended');
RESET ROLE;
UPDATE public.member_profiles SET suspended=false WHERE user_id='00000000-0000-4000-8000-000000000091';
UPDATE public.member_classifieds_settings SET public_enabled=false;
SELECT pg_temp.check_true(NOT public.member_classifieds_pilot('00000000-0000-4000-8000-000000000091'),'rollback suspends public eligibility');
UPDATE public.member_classifieds_settings SET public_enabled=true;
SELECT pg_temp.check_true(public.member_classifieds_pilot('00000000-0000-4000-8000-000000000091'),'reopening restores ordinary member eligibility');
SELECT pg_temp.check_true(NOT public.member_classifieds_pilot('00000000-0000-4000-8000-000000000005'),'anonymous auth denied');
SELECT pg_temp.check_true(NOT public.member_classifieds_pilot(NULL),'missing actor denied');
