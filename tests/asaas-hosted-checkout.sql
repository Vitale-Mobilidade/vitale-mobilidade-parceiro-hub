\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
UPDATE public.member_billing_settings SET enabled=true,provider_ready=true,hosted_ready=false;
INSERT INTO public.member_bike_listings(user_id,title,brand,model,price_cents,city,state,mileage_km,description,fee_status) VALUES('00000000-0000-4000-8000-000000000090','Bike no checkout hospedado','Marca','Modelo',100000,'São Paulo','SP',1234,'Descrição sintética completa para validar o checkout hospedado.','pilot_exempt') RETURNING id AS hosted_listing \gset
SELECT pg_temp.check_true(NOT public.member_listing_entitled(:'hosted_listing'),'channel account has the same paid entitlement');
SELECT pg_temp.check_true(public.member_listing_json(l)->>'feeStatus'='required','no free publication option') FROM public.member_bike_listings l WHERE id=:'hosted_listing';
INSERT INTO public.member_media_assets(user_id,kind,listing_id,position,object_path,status) VALUES('00000000-0000-4000-8000-000000000090','listing',:'hosted_listing',0,'00000000-0000-4000-8000-000000000090/listings/'||:'hosted_listing'||'/'||gen_random_uuid()||'.webp','ready');
SELECT pg_temp.expect_error(format('SELECT public.member_billing_checkout(%L,%L,%L,true,true)','00000000-0000-4000-8000-000000000090',:'hosted_listing','hosted'),'billing_unavailable');
UPDATE public.member_billing_settings SET hosted_ready=true;
SELECT public.member_billing_checkout('00000000-0000-4000-8000-000000000090',:'hosted_listing','hosted',true,true)->>'id' AS hosted_order \gset
SELECT pg_temp.check_true(public.member_billing_checkout('00000000-0000-4000-8000-000000000090',:'hosted_listing','hosted',true,true)->>'id'=:'hosted_order','hosted checkout reserves one order');
UPDATE public.member_listing_billing SET checkout_id='30000000-0000-4000-8000-000000000001',checkout_expires_at=now()+interval '1 hour' WHERE id=:'hosted_order';
INSERT INTO public.member_billing_events(id,kind,resource_id,resource_type,order_reference) VALUES('evt_hosted&123','CHECKOUT_PAID','30000000-0000-4000-8000-000000000001','checkout',:'hosted_order');
SELECT pg_temp.check_true(NOT public.member_listing_entitled(:'hosted_listing'),'checkout paid notification alone is not financial entitlement');
SELECT public.member_billing_record_payment(:'hosted_order','pay_hosted_confirmed','CONFIRMED',true,current_date,now());
SELECT pg_temp.check_true(public.member_listing_entitled(:'hosted_listing'),'authoritative payment publishes the hosted listing');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT checkout_id FROM public.member_listing_billing','permission denied');
SELECT public.member_classifieds('withdraw',jsonb_build_object('id',:'hosted_listing'));
RESET ROLE;
SELECT pg_temp.check_true(NOT public.member_listing_entitled(:'hosted_listing'),'withdrawal revokes hosted checkout entitlement');
SELECT pg_temp.check_true((SELECT status='cancel_pending' FROM public.member_listing_billing WHERE id=:'hosted_order'),'withdrawal queues checkout and subscription cancellation');
