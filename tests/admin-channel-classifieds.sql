\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
-- Team identity without community profile or personal verification.
DELETE FROM public.member_profiles WHERE user_id='00000000-0000-4000-8000-000000000001';
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.member_profiles WHERE user_id='00000000-0000-4000-8000-000000000001'),'admin has no community account');
SELECT pg_temp.expect_error($q$SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000091','create')$q$,'forbidden');
SELECT pg_temp.expect_error($q$SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000091',30)$q$,'forbidden');
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','create')$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000001',30)$q$,'permission denied');
RESET ROLE;
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','create')->>'id' AS channel_id \gset
SELECT pg_temp.check_true(public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','get',jsonb_build_object('id',:'channel_id'))->>'sellerType'='channel','institutional source independent of profile');
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','save',jsonb_build_object('id',:'channel_id','title','Bike do canal de teste','brand','Marca','model','Modelo','priceCents',350000,'city','São Paulo','state','SP','mileageKm',120,'condition','good','battery','unknown','invoice',false,'description','Descrição realista de uma bike de teste inteiramente sintética.'));
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','reserve_image',jsonb_build_object('id',:'channel_id')) AS channel_asset \gset
SELECT :'channel_asset'::jsonb->>'id' AS channel_asset_id,:'channel_asset'::jsonb->>'path' AS channel_asset_path \gset
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('member-media',:'channel_asset_path','{"size":1024,"mimetype":"image/webp"}');
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','finalize_image',jsonb_build_object('id',:'channel_id','assetId',:'channel_asset_id'));
SELECT pg_temp.expect_error(format('SELECT public.admin_channel_classifieds(%L,%L,%L::jsonb)','00000000-0000-4000-8000-000000000001','publish',jsonb_build_object('id',:'channel_id','contactConsent',true,'whatsapp','not-a-number')),'listing_contact_invalid');
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','publish',jsonb_build_object('id',:'channel_id','contactConsent',true,'whatsapp','5511999999999'));
SELECT pg_temp.check_true(jsonb_array_length(public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','list'))=1,'Admin list reads institutional inventory without profiles');
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.member_listing_billing WHERE listing_id=:'channel_id'),'institutional publication creates no fake financial transaction');
SELECT pg_temp.check_true((SELECT channel_expires_at>now()+interval '89 days' FROM public.member_bike_listings WHERE id=:'channel_id'),'institutional 90 day window');
SET ROLE anon;
SELECT pg_temp.check_true(public.member_bike_image_public(:'channel_asset_id')=:'channel_asset_path','channel public photo resolver without member profile');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM storage.objects WHERE name=:'channel_asset_path'),'channel public image read through restrictive policy');
SELECT pg_temp.check_true(public.member_bike_listings_public(:'channel_id')->'items'->0->>'sellerName'='Vitale Mobilidade','public institutional identity');
SELECT pg_temp.check_true(public.member_bike_listings_public(:'channel_id')->'items'->0->>'whatsapp'='5511999999999','public institutional contact');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','save',jsonb_build_object('id',:'channel_id')),'listing_unavailable');
RESET ROLE;
SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7) AS report \gset
SELECT pg_temp.check_true((:'report'::jsonb->>'channelListings')::integer=1,'one channel ad counted');
SELECT pg_temp.check_true((:'report'::jsonb->>'grossCents')::integer=15000,'only ordinary confirmed purchase counts as revenue');
SELECT pg_temp.check_true(jsonb_array_length(:'report'::jsonb->'daily')=7,'daily zero-fill fixed range');
SELECT pg_temp.check_true((SELECT sum((d->>'grossCents')::integer) FROM jsonb_array_elements(:'report'::jsonb->'daily') d)=15000,'gross deduplicated by order');
SELECT pg_temp.check_true(NOT (:'report'::jsonb::text LIKE '%@%'),'dashboard aggregate contains no personal emails');
-- Another provider event for the same purchase cannot double-count revenue.
INSERT INTO public.member_listing_payment_cycles(payment_id,order_id,status,paid,due_date,period_end) SELECT 'duplicate_synthetic_event',id,'CONFIRMED',true,current_date,NULL FROM public.member_listing_billing LIMIT 1;
SELECT pg_temp.check_true((public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)->>'grossCents')::integer=15000,'multiple payment sources do not duplicate an order');
-- 01:00 UTC belongs to the previous São Paulo day, never the UTC day.
UPDATE public.member_listing_billing SET paid_at=((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'UTC')+interval '1 hour';
SELECT pg_temp.check_true((SELECT (d->>'grossCents')::integer=15000 FROM jsonb_array_elements(public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)->'daily') d WHERE d->>'day'=((now() AT TIME ZONE 'America/Sao_Paulo')::date-1)::text),'revenue follows São Paulo calendar boundary');
UPDATE public.member_listing_payment_cycles SET status='REFUNDED',paid=false;
SELECT pg_temp.check_true((public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)->>'reversedPayments')::integer=1,'refund count deduplicates the order');
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','archive',jsonb_build_object('id',:'channel_id'));
SET ROLE anon;
SELECT pg_temp.check_true((public.member_bike_listings_public(:'channel_id')->>'total')::integer=0,'disabled channel hidden');
SELECT pg_temp.check_true(public.member_bike_image_public(:'channel_asset_id') IS NULL,'disabled channel media hidden');
RESET ROLE;
UPDATE public.editorial_admin_memberships SET active=false WHERE user_id='00000000-0000-4000-8000-000000000001';
SELECT pg_temp.expect_error($q$SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)$q$,'forbidden');
