\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % wanted %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
UPDATE public.member_community_settings SET enabled=true;
UPDATE public.member_classifieds_settings SET enabled=true,pilot_user_id='00000000-0000-4000-8000-000000000090',channel_seller_user_id='00000000-0000-4000-8000-000000000090';
UPDATE public.member_profiles SET suspended=false WHERE user_id='00000000-0000-4000-8000-000000000090';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_classifieds('account')->>'sellerType'='channel','channel designation comes from private settings');
SELECT pg_temp.expect_error('SELECT channel_seller_user_id FROM public.member_classifieds_settings','permission denied');
SELECT public.member_classifieds('create')->>'id' AS partial_id \gset
SELECT pg_temp.check_true(public.member_classifieds('create')->>'id'=:'partial_id','repeated create reuses untouched blank draft');
SELECT public.member_classifieds('save',jsonb_build_object('id',:'partial_id','title','','brand','Marca parcial','model','','priceCents',0,'city','','state','','modelYear',null,'mileageKm',null,'condition','good','battery','unknown','invoice',false,'description','','maintenance',''));
SELECT pg_temp.check_true(EXISTS(SELECT 1 FROM jsonb_array_elements(public.member_classifieds('mine')) l WHERE l->>'id'=:'partial_id' AND l->>'brand'='Marca parcial'),'partial draft persists');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','publish',jsonb_build_object('id',:'partial_id','contactConsent',true)),'listing_incomplete');
SELECT public.member_classifieds('archive',jsonb_build_object('id',:'partial_id'));
SELECT pg_temp.check_true((SELECT l->>'status' FROM jsonb_array_elements(public.member_classifieds('mine')) l WHERE l->>'id'=:'partial_id')='archived','deactivation keeps data');
SELECT public.member_classifieds('withdraw',jsonb_build_object('id',:'partial_id'));
SELECT pg_temp.check_true((SELECT l->>'status' FROM jsonb_array_elements(public.member_classifieds('mine')) l WHERE l->>'id'=:'partial_id')='draft','reactivation never publishes directly');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000091',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_classifieds('account')->>'sellerType'='individual','ordinary member never becomes channel admin');
SELECT pg_temp.expect_error(format('SELECT public.member_classifieds(%L,%L::jsonb)','archive',jsonb_build_object('id',:'partial_id','sellerType','channel')),'classifieds_pilot_only');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id='00000000-0000-4000-8000-000000000090'),'no editorial admin grant');
-- The designated channel identity is public only on a genuinely publishable listing.
SELECT id AS public_id FROM public.member_bike_listings WHERE user_id='00000000-0000-4000-8000-000000000090' AND brand='Marca' LIMIT 1 \gset
UPDATE public.member_media_assets SET status='removed' WHERE listing_id=:'public_id' AND status='reserved';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT public.member_classifieds('publish',jsonb_build_object('id',:'public_id','contactConsent',true));
RESET ROLE;
SET ROLE anon;
SELECT pg_temp.check_true(public.member_bike_listings_public()->'items'->0->>'sellerType'='channel','channel badge projected from private designation');
SELECT pg_temp.check_true(public.member_bike_listings_public()->'items'->0->>'sellerName'='Vitale Mobilidade','channel seller uses the Vitale identity');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000090',false);
SET ROLE authenticated;
SELECT public.member_classifieds('archive',jsonb_build_object('id',:'public_id'));
RESET ROLE;
SELECT pg_temp.check_true((public.member_bike_listings_public()->>'total')::integer=0,'deactivated bike disappears from public projection');
