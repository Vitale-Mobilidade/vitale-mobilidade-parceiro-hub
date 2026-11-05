\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
-- Entirely synthetic, run after --launch fixtures in a disposable PostgreSQL database.
RESET ROLE;
UPDATE public.editorial_admin_memberships SET active=true WHERE user_id='00000000-0000-4000-8000-000000000001';
UPDATE public.member_listing_payment_cycles SET status='RECEIVED',paid=true;
UPDATE public.member_listing_billing SET hold=false,status='active',paid_until=now()+interval '40 days',display_started_at=now()-interval '50 days';
SELECT id AS paid_order,listing_id AS source_id,paid_until::text AS original_deadline FROM public.member_listing_billing WHERE user_id='00000000-0000-4000-8000-000000000091' LIMIT 1 \gset
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT public.member_classifieds('withdraw',jsonb_build_object('id',:'source_id'));
SELECT public.member_classifieds('create')->>'id' AS target_id \gset
SELECT pg_temp.check_true(jsonb_array_length(public.member_classifieds('periods',jsonb_build_object('id',:'target_id')))=1,'existing paid inactive period available');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','publish',jsonb_build_object('id',:'target_id','contactConsent',true)),'listing_phone_confirmation');
SELECT public.member_classifieds('save',jsonb_build_object('id',:'source_id','title','Bike original paga','brand','Marca','model','Modelo','priceCents',350000,'city','São Paulo','state','SP','mileageKm',120,'condition','good','battery','unknown','invoice',false,'description','Descrição de uma bike sintética sem dados de pessoa real.','whatsappMessage','Tenho interesse na *{bike}*. {link}','confirmContact',true,'contactPhone','5511999999998'));
SELECT public.member_classifieds('publish',jsonb_build_object('id',:'source_id','contactConsent',true));
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','claim_period',jsonb_build_object('id',:'target_id','orderId',:'paid_order')),'period_in_use');
SELECT public.member_classifieds('archive',jsonb_build_object('id',:'source_id'));
SELECT public.member_classifieds('claim_period',jsonb_build_object('id',:'target_id','orderId',:'paid_order'));
RESET ROLE;
SELECT pg_temp.check_true((SELECT purchased_listing_id=:'source_id' AND listing_id=:'target_id' AND paid_until=:'original_deadline'::timestamptz FROM public.member_listing_billing WHERE id=:'paid_order'),'reassignment preserves original purchase and deadline');
SELECT pg_temp.check_true((SELECT count(*)=1 FROM public.member_listing_period_transfers WHERE order_id=:'paid_order'),'transfer audited exactly once');
SELECT pg_temp.check_true(NOT public.member_listing_entitled(:'source_id') AND public.member_listing_entitled(:'target_id'),'only new listing has the paid slot');
-- Restore temporarily for photo/order tests while original source remains inactive.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT public.member_classifieds('withdraw',jsonb_build_object('id',:'source_id'));
SELECT public.member_classifieds('claim_period',jsonb_build_object('id',:'source_id','orderId',:'paid_order'));
SELECT public.member_classifieds('reserve_image',jsonb_build_object('id',:'target_id')) AS photo1 \gset
SELECT public.member_classifieds('reserve_image',jsonb_build_object('id',:'target_id')) AS photo2 \gset
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('member-media',:'photo1'::jsonb->>'path','{"size":1024,"mimetype":"image/webp"}'),('member-media',:'photo2'::jsonb->>'path','{"size":1024,"mimetype":"image/webp"}');
SELECT public.member_classifieds('finalize_image',jsonb_build_object('id',:'target_id','assetId',:'photo1'::jsonb->>'id'));
SELECT public.member_classifieds('finalize_image',jsonb_build_object('id',:'target_id','assetId',:'photo2'::jsonb->>'id'));
SELECT public.member_classifieds('reorder',jsonb_build_object('id',:'target_id','imageIds',jsonb_build_array(:'photo2'::jsonb->>'id',:'photo1'::jsonb->>'id')));
SELECT pg_temp.check_true((public.member_classifieds('mine')->0->'images'->0->>'id')=(:'photo2'::jsonb->>'id'),'complete reordering changes cover');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','reorder',jsonb_build_object('id',:'target_id','imageIds',jsonb_build_array(:'photo2'::jsonb->>'id',:'photo2'::jsonb->>'id'))),'invalid_input');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','save',jsonb_build_object('id',:'target_id','confirmContact',true,'contactPhone','5511999999999')),'listing_phone_confirmation');
RESET ROLE;
SELECT pg_temp.expect_error(format('SELECT public.member_billing_purchase(%L,%L,true,true)','00000000-0000-4000-8000-000000000091',:'target_id'),'listing_phone_confirmation');
-- A verified new draft must use an available period rather than create another charge.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT public.member_classifieds('save',jsonb_build_object('id',:'target_id','title','Segunda bike completa','brand','Marca','model','Modelo','priceCents',350000,'city','São Paulo','state','SP','mileageKm',120,'condition','good','battery','unknown','invoice',false,'description','Descrição sintética da segunda bicicleta completa.','confirmContact',true,'contactPhone','5511999999998'));
RESET ROLE;
SELECT pg_temp.expect_error(format('SELECT public.member_billing_purchase(%L,%L,true,true)','00000000-0000-4000-8000-000000000091',:'target_id'),'billing_credit_available');
-- Claims by another owner and direct access to helpers/table must fail.
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','claim_period',jsonb_build_object('id',:'target_id','orderId',:'paid_order')),'listing_unavailable');
SELECT pg_temp.expect_error('SELECT * FROM public.member_listing_events','permission denied');
SELECT pg_temp.expect_error('SELECT public.member_available_periods(auth.uid(),gen_random_uuid())','permission denied');
RESET ROLE;
-- Publish a channel bike for anonymous metrics; no contact details in the aggregate.
SELECT public.admin_channel_classifieds('00000000-0000-4000-8000-000000000001','create')->>'id' AS metric_id \gset
UPDATE public.member_bike_listings SET title='Bike de métricas',brand='Marca',model='Modelo',price_cents=123000,city='São Paulo',state='SP',mileage_km=1,description='Descrição sintética da bicicleta de métricas.',channel_whatsapp='5511999999999',contact_consent_at=now(),status='published' WHERE id=:'metric_id';
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT public.member_listing_track(:'metric_id','visit','00000000-0000-4000-8000-000000000777');
SELECT public.member_listing_track(:'metric_id','visit','00000000-0000-4000-8000-000000000777');
SELECT public.member_listing_track(:'metric_id','impression','00000000-0000-4000-8000-000000000777');
SELECT public.member_listing_track(:'metric_id','whatsapp','00000000-0000-4000-8000-000000000777');
SELECT pg_temp.expect_error(format('SELECT public.member_listing_metrics(%L)',:'metric_id'),'permission denied');
RESET ROLE;
SELECT pg_temp.check_true(public.member_listing_metrics(:'metric_id')='{"impressions":1,"visits":1,"whatsappClicks":1}'::jsonb,'deduplicated private metrics');
SELECT pg_temp.check_true(NOT (public.member_bike_listings_public(:'metric_id')->'items'->0 ? 'metrics'),'public projection has no seller metrics');
UPDATE public.member_listing_billing SET hold=true WHERE id=:'paid_order';
SELECT pg_temp.expect_error(format('SELECT public.member_claim_period(%L,%L,%L)','00000000-0000-4000-8000-000000000091',:'target_id',:'paid_order'),'billing_required');
UPDATE public.member_listing_billing SET hold=false,paid_until=now()-interval '1 second' WHERE id=:'paid_order';
SELECT pg_temp.expect_error(format('SELECT public.member_claim_period(%L,%L,%L)','00000000-0000-4000-8000-000000000091',:'target_id',:'paid_order'),'billing_required');

-- Prepare two complete, verified candidates for a concurrent claim/publication test.
UPDATE public.member_listing_billing SET hold=false,status='active',paid_until=now()+interval '40 days' WHERE id=:'paid_order';
INSERT INTO public.member_bike_listings(id,user_id,title,brand,model,price_cents,city,state,mileage_km,description,confirmed_phone,contact_confirmed_at)
SELECT x,'00000000-0000-4000-8000-000000000091','Bike concorrente completa','Marca','Modelo',350000,'São Paulo','SP',1,'Descrição sintética para teste concorrente.','5511999999998',now()
FROM unnest(ARRAY['00000000-0000-4000-8000-000000000781'::uuid,'00000000-0000-4000-8000-000000000782'::uuid]) x;
INSERT INTO public.member_media_assets(id,user_id,listing_id,kind,object_path,status)
SELECT gen_random_uuid(),'00000000-0000-4000-8000-000000000091',x,'listing','synthetic-concurrency-'||x::text,'ready'
FROM unnest(ARRAY['00000000-0000-4000-8000-000000000781'::uuid,'00000000-0000-4000-8000-000000000782'::uuid]) x;
