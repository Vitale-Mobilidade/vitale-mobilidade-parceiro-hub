\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
SELECT pg_temp.check_true(NOT enabled AND NOT purchase_ready,'migration disables new checkouts until capability proof') FROM public.member_billing_settings;
SELECT pg_temp.check_true(NOT has_function_privilege('authenticated','public.member_billing_purchase(uuid,uuid,boolean,boolean)','EXECUTE'),'purchase reserve is service-only');
SELECT pg_temp.check_true(NOT has_function_privilege('anon','public.member_billing_start_display()','EXECUTE'),'start-display trigger is private');
SELECT pg_temp.expect_error('SELECT public.member_billing_checkout(null,null,''hosted'',true,true)','billing_model_changed');
UPDATE public.member_billing_settings SET enabled=true,provider_ready=true,purchase_ready=false;
INSERT INTO public.member_bike_listings(user_id,title,brand,model,price_cents,city,state,mileage_km,description,fee_status) VALUES('00000000-0000-4000-8000-000000000090','Bike para noventa dias','Marca','Modelo',100000,'São Paulo','SP',1234,'Descrição sintética completa para testar o pagamento único.','required') RETURNING id AS listing \gset
INSERT INTO public.member_media_assets(user_id,kind,listing_id,position,object_path,status) VALUES('00000000-0000-4000-8000-000000000090','listing',:'listing',0,'00000000-0000-4000-8000-000000000090/listings/'||:'listing'||'/'||gen_random_uuid()||'.webp','ready') RETURNING id AS photo \gset
SELECT pg_temp.expect_error(format('SELECT public.member_billing_purchase(%L,%L,true,true)','00000000-0000-4000-8000-000000000090',:'listing'),'billing_unavailable');
UPDATE public.member_billing_settings SET purchase_ready=true;
SELECT pg_temp.expect_error(format('SELECT public.member_billing_purchase(%L,%L,true,false)','00000000-0000-4000-8000-000000000090',:'listing'),'billing_consent_required');
SELECT public.member_billing_purchase('00000000-0000-4000-8000-000000000090',:'listing',true,true)->>'id' AS purchase \gset
SELECT pg_temp.check_true(public.member_billing_purchase('00000000-0000-4000-8000-000000000090',:'listing',true,true)->>'id'=:'purchase','double click reuses the same one-time order');
SELECT pg_temp.check_true(billing_model='one_time_90d' AND amount_cents=15000 AND display_days=90 AND subscription_id IS NULL AND paid_at IS NULL AND paid_until IS NULL,'purchase terms fixed; checkout alone starts no display') FROM public.member_listing_billing WHERE id=:'purchase';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(''publish'',jsonb_build_object(''id'',%L,''contactConsent'',true))',:'listing'),'billing_required');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(''cover'',jsonb_build_object(''id'',%L,''imageId'',%L))',:'listing',:'photo'),'billing_pending');
RESET ROLE;
SELECT public.member_billing_record_payment(:'purchase','pay_90_days','CONFIRMED',true,current_date,now());
SELECT pg_temp.check_true((SELECT status='published' FROM public.member_bike_listings WHERE id=:'listing'),'authoritative payment publishes the authorized saved revision');
SELECT pg_temp.check_true(paid_at IS NOT NULL AND display_started_at IS NOT NULL AND paid_until=display_started_at+interval '2160 hours','exactly 90 days from first publication') FROM public.member_listing_billing WHERE id=:'purchase';
SELECT paid_until AS deadline,display_started_at AS started FROM public.member_listing_billing WHERE id=:'purchase' \gset
SELECT public.member_billing_record_payment(:'purchase','pay_90_days','RECEIVED',true,current_date,now());
SELECT pg_temp.check_true(paid_until=:'deadline'::timestamptz,'duplicate financial event never extends the term') FROM public.member_listing_billing WHERE id=:'purchase';
SET ROLE authenticated;
SELECT public.member_classifieds('withdraw',jsonb_build_object('id',:'listing'));
SELECT public.member_classifieds('save',jsonb_build_object('id',:'listing','title','Bike editada sem nova cobrança','brand','Marca','model','Modelo','priceCents',123400,'city','São Paulo','state','SP','mileageKm',1250,'condition','good','battery','unknown','invoice',false,'description','Descrição atualizada e completa após pausa do anúncio.','maintenance',''));
SELECT public.member_classifieds('publish',jsonb_build_object('id',:'listing','contactConsent',true));
RESET ROLE;
SELECT pg_temp.check_true(status='active' AND paid_until=:'deadline'::timestamptz AND display_started_at=:'started'::timestamptz,'pause/edit/republication keeps original paid window without cancellation') FROM public.member_listing_billing WHERE id=:'purchase';
SELECT public.member_billing_record_payment(:'purchase','pay_90_days','PENDING',false,current_date,now()-interval '1 hour');
SELECT pg_temp.check_true(public.member_listing_entitled(:'listing'),'stale proof cannot undo a newer payment');
SELECT public.member_billing_record_payment(:'purchase','pay_90_days','REFUND_IN_PROGRESS',false,current_date,now());
SELECT pg_temp.check_true(NOT public.member_listing_entitled(:'listing'),'refund immediately revokes entitlement');
SELECT pg_temp.check_true((SELECT status='draft' FROM public.member_bike_listings WHERE id=:'listing'),'refund removes ad from display');
SELECT pg_temp.check_true(public.member_bike_image_public(:'photo') IS NULL,'refund removes public media access');
-- Restored authoritative source may unblock, but never silently republish after withdrawal/refund.
SELECT public.member_billing_record_payment(:'purchase','pay_90_days','RECEIVED',true,current_date,now());
SELECT pg_temp.check_true((SELECT status='draft' FROM public.member_bike_listings WHERE id=:'listing'),'refund recovery does not auto-publish');
SET ROLE authenticated;
SELECT public.member_classifieds('publish',jsonb_build_object('id',:'listing','contactConsent',true));
RESET ROLE;
UPDATE public.member_listing_billing SET paid_until=now()-interval '1 second' WHERE id=:'purchase';
SELECT pg_temp.check_true(NOT public.member_listing_entitled(:'listing'),'expired rights blocked before cron runs');
SELECT pg_temp.check_true(public.member_bike_image_public(:'photo') IS NULL,'expired images blocked before cron');
SELECT public.member_billing_expire_periods();
SELECT pg_temp.check_true(status='expired' AND subscription_id IS NULL,'expiry is terminal, never a new charge') FROM public.member_listing_billing WHERE id=:'purchase';
SELECT pg_temp.check_true((SELECT status='draft' FROM public.member_bike_listings WHERE id=:'listing'),'expiry withdraws published listing');
SELECT public.member_billing_purchase('00000000-0000-4000-8000-000000000090',:'listing',true,true)->>'id' AS second_purchase \gset
SELECT pg_temp.check_true(:'second_purchase'<>:'purchase','a new 90-day period requires a new explicit purchase');
-- A cancellation racing a paid webhook preserves the purchase, but cannot publish it automatically.
UPDATE public.member_listing_billing SET status='cancelled',publish_requested=false,cancel_requested_at=now(),checkout_id='30000000-0000-4000-8000-000000000099' WHERE id=:'second_purchase';
SELECT public.member_billing_record_payment(:'second_purchase','pay_late_90','RECEIVED',true,current_date,now());
SELECT pg_temp.check_true(status='active' AND paid_at IS NOT NULL AND display_started_at IS NULL AND paid_until IS NULL,'late confirmed payment preserves unstarted paid right') FROM public.member_listing_billing WHERE id=:'second_purchase';
SELECT pg_temp.check_true((SELECT status='draft' FROM public.member_bike_listings WHERE id=:'listing'),'late payment cannot auto-publish after cancellation');
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND (subscription_id IS NOT NULL OR authorization_id IS NOT NULL)),'no one-time order contains recurring resources');

SET ROLE authenticated;
SELECT public.member_classifieds('publish',jsonb_build_object('id',:'listing','contactConsent',true));
RESET ROLE;
SELECT public.member_billing_record_payment(:'purchase','pay_90_days','REFUNDED',false,current_date,now());
SELECT pg_temp.check_true((SELECT status='published' FROM public.member_bike_listings WHERE id=:'listing'),'late events for an expired purchase cannot withdraw a newer paid publication');
