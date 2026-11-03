\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$ DECLARE failed boolean:=false; BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % (wanted %)',SQLERRM,fragment; END IF; failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment; END IF; END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
SET ROLE anon;
SELECT pg_temp.expect_error('SELECT public.member_identity()','permission denied');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT * FROM public.member_identity_challenges','permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_identity_verifications','permission denied');
SELECT pg_temp.expect_error($q$SELECT public.member_identity_service('start','00000000-0000-4000-8000-000000000013','{}')$q$,'permission denied');
SELECT pg_temp.expect_error($q$SELECT public.member_identity_verified('00000000-0000-4000-8000-000000000013')$q$,'permission denied');
SELECT pg_temp.check_true(public.member_identity()->>'canInteract'='false','Auth auto-confirm is not mailbox proof');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Sem validação"}')$q$,'identity_verification_required');
RESET ROLE;
UPDATE auth.users SET raw_user_meta_data=raw_user_meta_data||'{"email_verified":true,"phone_verified":true,"canInteract":true}'::jsonb WHERE id='00000000-0000-4000-8000-000000000013';
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity()->>'canInteract'='false','metadata cannot grant verification');
RESET ROLE;
SET ROLE service_role;
WITH reply AS MATERIALIZED(SELECT public.member_identity_service('start','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','email','destination','forged@example.invalid','fingerprint',repeat('a',32))) r)
SELECT r->>'id' AS email_id,r->>'code' AS email_code,r->>'destination' AS email_destination FROM reply \gset
SELECT pg_temp.check_true(:'email_destination'='immediate-new-member@example.invalid','email destination comes from Auth, not caller');
SELECT pg_temp.check_true(public.member_identity_service('start','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','email','fingerprint',repeat('a',32)))->>'error'='identity_rate_limited','code resend cooldown enforced');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity('verify',jsonb_build_object('channel','email','code',:'email_code'))->>'ok'='false','undelivered code cannot verify');
RESET ROLE;
SET ROLE service_role;
SELECT public.member_identity_service('delivered','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','email','id',:'email_id'));
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity('verify',jsonb_build_object('channel','email','code',:'email_code'))->>'ok'='false','another account cannot consume code');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity('verify',jsonb_build_object('channel','email','code',:'email_code'))->>'ok'='true','correct delivered email code verifies');
SELECT pg_temp.check_true(public.member_identity('verify',jsonb_build_object('channel','email','code',:'email_code'))->>'ok'='false','consumed code cannot replay');
SELECT pg_temp.check_true(public.member_identity()->>'emailVerified'='true' AND public.member_identity()->>'canInteract'='false','email alone cannot unlock interaction');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Só e-mail validado"}')$q$,'identity_verification_required');
RESET ROLE;
SET ROLE service_role;
SELECT pg_temp.expect_error($q$SELECT public.member_identity_service('start','00000000-0000-4000-8000-000000000013','{"channel":"phone","phone":"+5511999999999","fingerprint":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}')$q$,'invalid_phone');
WITH reply AS MATERIALIZED(SELECT public.member_identity_service('start','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','phone','phone','+5511999999999','consent',true,'fingerprint',repeat('a',32))) r)
SELECT r->>'id' AS phone_id,r->>'code' AS phone_code FROM reply \gset
SELECT public.member_identity_service('delivered','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','phone','id',:'phone_id'));
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity('verify',jsonb_build_object('channel','phone','code',:'phone_code'))->>'ok'='true','correct WhatsApp code verifies phone possession');
SELECT pg_temp.check_true(public.member_identity()->>'canInteract'='true','both proofs unlock interaction');
SELECT pg_temp.check_true(NOT(public.member_identity()?|ARRAY['destination','code','code_hash','email_address','phone_number','user_id']),'status projects only own booleans and masked phone');
SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Identidade validada nos dois canais"}');
RESET ROLE;
SELECT id AS own_comment FROM public.member_article_comments WHERE user_id='00000000-0000-4000-8000-000000000013' AND body='Identidade validada nos dois canais' \gset
UPDATE auth.users SET email_confirmed_at=now() WHERE id='00000000-0000-4000-8000-000000000013';
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity()->>'emailVerified'='false' AND public.member_identity()->>'canInteract'='false','renewed Auth email confirmation invalidates old verification even for same address');
RESET ROLE;
UPDATE auth.users SET email='changed-identity@example.invalid' WHERE id='00000000-0000-4000-8000-000000000013';
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity()->>'emailVerified'='false' AND public.member_identity()->>'canInteract'='false','changing Auth email invalidates old mailbox proof');
SELECT public.member_community('remove_comment',jsonb_build_object('id',:'own_comment'));
RESET ROLE;
UPDATE public.member_identity_challenges SET created_at=now()-interval '2 minutes' WHERE user_id='00000000-0000-4000-8000-000000000013' AND channel='email';
SET ROLE service_role;
WITH reply AS MATERIALIZED(SELECT public.member_identity_service('start','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','email','fingerprint',repeat('b',32))) r)
SELECT r->>'id' AS new_id,r->>'code' AS new_code FROM reply \gset
SELECT pg_temp.check_true(public.member_identity_service('delivered','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','email','id',:'email_id'))->>'ok'='false','old delivery ACK cannot enable new challenge');
SELECT public.member_identity_service('delivered','00000000-0000-4000-8000-000000000013',jsonb_build_object('channel','email','id',:'new_id'));
RESET ROLE;
UPDATE public.member_identity_challenges SET expires_at=now()-interval '1 second' WHERE user_id='00000000-0000-4000-8000-000000000013' AND channel='email';
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_identity('verify',jsonb_build_object('channel','email','code',:'new_code'))->>'error'='identity_code_expired','expired code rejected');
RESET ROLE;
UPDATE public.member_identity_challenges SET expires_at=now()+interval '10 minutes',code_hash=sha256(convert_to(id::text||':000001','UTF8')) WHERE user_id='00000000-0000-4000-8000-000000000013' AND channel='email';
SET ROLE authenticated;
SELECT public.member_identity('verify','{"channel":"email","code":"000000"}');
SELECT public.member_identity('verify','{"channel":"email","code":"000000"}');
SELECT public.member_identity('verify','{"channel":"email","code":"000000"}');
SELECT public.member_identity('verify','{"channel":"email","code":"000000"}');
SELECT public.member_identity('verify','{"channel":"email","code":"000000"}');
SELECT pg_temp.check_true(public.member_identity('verify','{"channel":"email","code":"000001"}')->>'ok'='false','five failed guesses lock challenge even with correct sixth');
RESET ROLE;
SELECT pg_temp.check_true((SELECT attempts=5 FROM public.member_identity_challenges WHERE user_id='00000000-0000-4000-8000-000000000013' AND channel='email'),'wrong guesses persist instead of rolling back');
UPDATE public.member_identity_challenges SET attempts=0 WHERE user_id='00000000-0000-4000-8000-000000000013' AND channel='email';
SELECT 'Independent newsletter, two possession proofs, server gate and OTP security passed.';
