\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.assert_ok(value boolean, detail text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %', detail; END IF; END $$;
CREATE FUNCTION pg_temp.reject(statement text, reason text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN
  IF position(reason IN SQLERRM)>0 THEN RETURN; END IF;
  RAISE;
 END;
 RAISE EXCEPTION 'FAILED: expected %',reason;
END $$;

INSERT INTO auth.users(id,email,is_anonymous) VALUES
 ('00000000-0000-4000-8000-000000000933','incomplete@example.invalid',false),
 ('00000000-0000-4000-8000-000000000934','other@example.invalid',false);
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000933',false);
SET ROLE authenticated;
SELECT public.member_classifieds('account') AS account \gset
SELECT pg_temp.assert_ok((:'account'::jsonb->>'canAdvertise')::boolean AND NOT (:'account'::jsonb->>'communityJoined')::boolean AND NOT (:'account'::jsonb->>'canPublish')::boolean, 'draft enabled before onboarding; publication denied');
SELECT public.member_classifieds('create')->>'id' AS ad \gset
SELECT pg_temp.assert_ok(public.member_classifieds('create')->>'id'=:'ad','empty reservation reused');
SELECT public.member_classifieds('reserve_image',jsonb_build_object('id',:'ad')) AS image \gset
SELECT pg_temp.assert_ok(public.member_media_access(:'image'::jsonb->>'path','insert'),'owner can upload to reserved path');
INSERT INTO storage.objects(bucket_id,name,metadata) VALUES('member-media',:'image'::jsonb->>'path','{"size":1200,"mimetype":"image/webp"}');
SELECT public.member_classifieds('finalize_image',jsonb_build_object('id',:'ad','assetId',:'image'::jsonb->>'id'));
SELECT pg_temp.assert_ok(public.member_media_access(:'image'::jsonb->>'path','select') AND NOT public.member_media_access(:'image'::jsonb->>'path','insert'),'ready image private and no overwrite');
SELECT public.member_classifieds('reorder',jsonb_build_object('id',:'ad','imageIds',jsonb_build_array(:'image'::jsonb->>'id')));
SELECT public.member_classifieds('save',jsonb_build_object(
 'id',:'ad','title','Bike em rascunho','brand','Marca','model','Modelo','priceCents',500000,'city','São Paulo','state','SP','mileageKm',100,'condition','good','battery','unknown','invoice',false,'description','Descrição de teste de cadastro flexível.','whatsappMessage','Quero saber mais.'));
SELECT pg_temp.assert_ok(public.member_classifieds('mine')->0->>'title'='Bike em rascunho', 'saved and accessible to owner');
SELECT pg_temp.reject(format('SELECT public.member_classifieds(%L,jsonb_build_object(''id'',%L))','publish',:'ad'),'classifieds_pilot_only');
SELECT pg_temp.reject(format('SELECT public.member_classifieds(%L,jsonb_build_object(''id'',%L))','periods',:'ad'),'classifieds_pilot_only');
RESET ROLE;
SELECT pg_temp.assert_ok(NOT EXISTS(SELECT 1 FROM public.member_profiles WHERE user_id='00000000-0000-4000-8000-000000000933'),'no profile or consent is manufactured');
SELECT pg_temp.reject(format('SELECT public.member_billing_purchase_at_price(%L,%L,true,true,(SELECT listing_fee_cents FROM public.member_classifieds_settings WHERE singleton))','00000000-0000-4000-8000-000000000933',:'ad'),'listing_phone_confirmation');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000934',false);
SET ROLE authenticated;
SELECT pg_temp.assert_ok(public.member_classifieds('mine')='[]'::jsonb AND NOT public.member_media_access(:'image'::jsonb->>'path','select'),'another signed-in user cannot see draft or photo');
SELECT pg_temp.reject(format('SELECT public.member_classifieds(%L,jsonb_build_object(''id'',%L))','archive',:'ad'),'listing_unavailable');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT pg_temp.assert_ok(NOT public.member_media_access(:'image'::jsonb->>'path','select'),'visitor cannot see draft photo');
RESET ROLE;
UPDATE auth.users SET is_anonymous=true WHERE id='00000000-0000-4000-8000-000000000934';
SELECT pg_temp.assert_ok(NOT public.member_classifieds_can_draft('00000000-0000-4000-8000-000000000934'),'anonymous user blocked');
INSERT INTO public.member_profiles(user_id,display_name,suspended) VALUES ('00000000-0000-4000-8000-000000000933','Anunciante teste',true);
SELECT pg_temp.assert_ok(NOT public.member_classifieds_can_draft('00000000-0000-4000-8000-000000000933'),'suspended user blocked');
