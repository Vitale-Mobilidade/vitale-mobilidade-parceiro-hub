\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
SELECT pg_temp.check_true(NOT has_function_privilege('service_role','public.member_billing_purchase(uuid,uuid,boolean,boolean)','EXECUTE'),'old release cannot reserve');
SELECT pg_temp.check_true(NOT has_function_privilege('authenticated','public.member_billing_purchase_at_price(uuid,uuid,boolean,boolean,integer)','EXECUTE'),'new reservation is service-only');
SELECT pg_temp.expect_error('SELECT public.member_billing_purchase_at_price(null,null,true,true,15000)','billing_price_changed');

INSERT INTO auth.users (id,email,email_confirmed_at) VALUES ('00000000-0000-4000-8000-000000000925','fee@example.invalid',now());
INSERT INTO public.member_profiles (user_id,display_name,community_joined_at)
 VALUES ('00000000-0000-4000-8000-000000000925','Anunciante 50',now());
INSERT INTO public.member_identity_verifications(user_id,email_address,email_verified_at,phone_number,phone_verified_at)
 VALUES('00000000-0000-4000-8000-000000000925','fee@example.invalid',now(),'+5511999999925',now());
INSERT INTO public.member_bike_listings(user_id,title,brand,model,price_cents,city,state,mileage_km,description,confirmed_phone,contact_confirmed_at)
 VALUES('00000000-0000-4000-8000-000000000925','Bike tarifa nova','Marca','Modelo',120000,'São Paulo','SP',123,'Descrição sintética para testar a nova tarifa.','5511999999925',now()) RETURNING id AS listing \gset
INSERT INTO public.member_media_assets(user_id,kind,listing_id,position,object_path,status)
 VALUES('00000000-0000-4000-8000-000000000925','listing',:'listing',0,'00000000-0000-4000-8000-000000000925/listings/'||:'listing'||'/'||gen_random_uuid()||'.webp','ready');
UPDATE public.member_billing_settings SET enabled=true,provider_ready=true,purchase_ready=true;
SET ROLE service_role;
SELECT public.member_billing_purchase_at_price('00000000-0000-4000-8000-000000000925',:'listing',true,true,5000)->>'id' AS purchase \gset
RESET ROLE;
SELECT pg_temp.check_true(o.amount_cents=5000 AND l.fee_cents=5000 AND o.display_days=90 AND o.paid_at IS NULL,'new order saves the new price without claiming payment')
 FROM public.member_listing_billing o JOIN public.member_bike_listings l ON l.id=o.listing_id WHERE o.id=:'purchase';
SELECT public.member_billing_record_payment(:'purchase','pay_fee_50','CONFIRMED',true,current_date,now());
SELECT pg_temp.check_true(o.amount_cents=5000 AND l.status='published' AND o.paid_until-o.display_started_at=interval '2160 hours','new paid order publishes for 90 days')
 FROM public.member_listing_billing o JOIN public.member_bike_listings l ON l.id=o.listing_id WHERE o.id=:'purchase';
