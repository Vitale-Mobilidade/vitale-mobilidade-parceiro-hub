\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean:=false; BEGIN
 BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN
  IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % (wanted %)',SQLERRM,fragment; END IF; failed:=true;
 END;
 IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment; END IF;
END $$;
SELECT pg_temp.check_true(NOT (SELECT enabled FROM public.member_referral_settings),'referrals disabled by default');
SET ROLE anon;
SELECT pg_temp.expect_error('SELECT public.member_referrals()','permission denied');
SELECT pg_temp.expect_error($q$SELECT public.newsletter_referral_service('register','{}')$q$,'permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_referral_signups','permission denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()='{"enabled":false}'::jsonb,'dashboard disabled without making a code');
SELECT pg_temp.expect_error($q$SELECT public.newsletter_referral_service('confirm','{"actorId":"00000000-0000-4000-8000-000000000001"}')$q$,'permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_referral_links','permission denied');
SELECT pg_temp.expect_error('UPDATE public.member_referral_settings SET enabled=true','permission denied');
RESET ROLE;
UPDATE public.member_referral_settings SET enabled=true;
SET ROLE authenticated;
SELECT public.member_referrals()->>'code' AS code_a \gset
SELECT pg_temp.check_true((public.member_referrals()->>'code')=:'code_a','personal code is stable');
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='0','starts with zero confirmations');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SET ROLE authenticated;
SELECT public.member_referrals()->>'code' AS code_b \gset
SELECT pg_temp.check_true(:'code_a'<>:'code_b','different users have different codes');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT public.member_referrals()','email_confirmation_required');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT public.member_referrals()','email_confirmation_required');
RESET ROLE;

SET ROLE service_role;
SELECT pg_temp.check_true(public.newsletter_referral_service('register',jsonb_build_object('code',repeat('f',32),'fingerprint',repeat('a',32)))->>'kind'='unattributed','invalid code can use normal newsletter');
SELECT pg_temp.expect_error(format('SELECT public.newsletter_referral_service(%L,%L::jsonb)','register',jsonb_build_object('code',:'code_a','email','guest@example.invalid','name','Guest','fingerprint',repeat('a',32))),'invalid_input');
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email',' Guest@Example.Invalid ','name','Guest','consent',true,'fingerprint',repeat('a',32))) AS first_claim \gset
SELECT (:'first_claim'::jsonb)->>'token' AS token_a \gset
SELECT pg_temp.check_true((:'first_claim'::jsonb)->>'send'='true','new request allocates confirmation');
SELECT pg_temp.check_true(length(:'token_a')=64,'256-bit confirmation token');
SELECT pg_temp.check_true(public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email','guest@example.invalid','name','Other name','consent',true,'fingerprint',repeat('a',32)))->>'send'='false','repeat request does not send within cooldown');
SELECT pg_temp.check_true(public.newsletter_referral_service('register',jsonb_build_object('code',:'code_b','email','guest@example.invalid','name','Other name','consent',true,'fingerprint',repeat('a',32)))->>'send'='false','second referrer cannot steal pending claim');
SELECT pg_temp.check_true(public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email',' A@Example.Invalid ','name','Self','consent',true,'fingerprint',repeat('a',32)))->>'send'='false','self email excluded');
SELECT pg_temp.check_true(public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email','alias@example.invalid','name','Alias','consent',true,'actorId','00000000-0000-4000-8000-000000000002','fingerprint',repeat('a',32)))->>'send'='false','verified self session excluded');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.newsletter_subscriptions)=0,'pending is not a campaign recipient');
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups)=1,'duplicates/self create no extra claims');
SELECT pg_temp.check_true((SELECT encode(token_hash,'hex')<>:'token_a' FROM public.member_referral_signups),'only hash retained');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'pending'='1','owner sees pending aggregate');
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='0','pending is not a confirmed referral');
SELECT pg_temp.check_true(NOT (public.member_referrals() ?| ARRAY['email','candidate_email','token','userId','names']),'dashboard has no guest data');
RESET ROLE;
SET ROLE service_role;
SELECT public.newsletter_referral_service('confirm',jsonb_build_object('token',:'token_a','fingerprint',repeat('b',32)));
SELECT public.newsletter_referral_service('confirm',jsonb_build_object('token',:'token_a','fingerprint',repeat('b',32)));
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.newsletter_subscriptions)=1,'confirmation/replay inserts once');
SELECT pg_temp.check_true((SELECT delivery_enabled FROM public.newsletter_subscriptions WHERE email='guest@example.invalid'),'existing newsletter delivery trigger applies');
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE credited)=1,'confirmation/replay credits once');
SELECT pg_temp.check_true((SELECT candidate_email IS NULL AND candidate_name IS NULL FROM public.member_referral_signups),'pending personal data cleared on confirmation');
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='1','owner sees confirmed aggregate');
SELECT pg_temp.check_true(jsonb_array_length(public.member_referrals()->'history')=1,'Sao Paulo daily history');
SELECT pg_temp.check_true(public.member_referrals()->>'pending'='0','confirmed leaves pending total');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='0','other reader sees only own totals');
RESET ROLE;
UPDATE public.newsletter_subscriptions SET status='unsubscribed',suppressed_at=now();
SET ROLE service_role;
SELECT pg_temp.check_true(public.newsletter_referral_service('register',jsonb_build_object('code',:'code_b','email','guest@example.invalid','name','Guest','consent',true,'fingerprint',repeat('a',32)))->>'send'='false','unsubscribed existing address excluded');
RESET ROLE;
SELECT pg_temp.check_true((SELECT status='unsubscribed' AND NOT delivery_enabled FROM public.newsletter_subscriptions),'no reactivation through referral');
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE credited)=1,'historical credit retained after unsubscribe');

-- Visit aggregates are bounded and do not change referral counts.
SET ROLE service_role;
SELECT public.newsletter_referral_service('visit',jsonb_build_object('code',:'code_a','fingerprint',repeat('c',32))) FROM generate_series(1,25);
SELECT public.newsletter_referral_service('visit',jsonb_build_object('code',:'code_a','actorId','00000000-0000-4000-8000-000000000002','fingerprint',repeat('d',32)));
RESET ROLE;
SELECT pg_temp.check_true((SELECT sum(visits) FROM public.member_referral_visits)=20,'visit rate cap and self-visit exclusion');

SET ROLE service_role;
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email','expired@example.invalid','name','Expired','consent',true,'fingerprint',repeat('a',32))) AS expires_claim \gset
SELECT (:'expires_claim'::jsonb)->>'token' AS expired_token \gset
RESET ROLE;
UPDATE public.member_referral_signups SET expires_at=now()-interval '1 second' WHERE candidate_email='expired@example.invalid';
SET ROLE service_role;
SELECT pg_temp.check_true(public.newsletter_referral_service('confirm',jsonb_build_object('token',:'expired_token','fingerprint',repeat('b',32)))->>'kind'='expired','expired link rejected');
SELECT pg_temp.check_true(public.newsletter_referral_service('confirm',jsonb_build_object('token',repeat('0',64),'fingerprint',repeat('b',32)))->>'kind'='invalid','invalid link rejected');
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_b','email','expired@example.invalid','name','Expired','consent',true,'fingerprint',repeat('a',32))) AS renewed_claim \gset
SELECT pg_temp.check_true((:'renewed_claim'::jsonb)->>'token'<>:'expired_token','expired request rotates token with new attribution');
RESET ROLE;
SELECT pg_temp.check_true((SELECT referrer_id='00000000-0000-4000-8000-000000000003' FROM public.member_referral_signups WHERE candidate_email='expired@example.invalid'),'expired claim may use new invite');

-- Normal signup winning before confirmation must not be credited or overwritten.
SET ROLE service_role;
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email','existing-race@example.invalid','name','Referral name','consent',true,'fingerprint',repeat('a',32))) AS existing_claim \gset
RESET ROLE;
INSERT INTO public.newsletter_subscriptions(person_name,email,consent_text,consent_version,status,suppressed_at) VALUES('Original name','existing-race@example.invalid','Original consent','v2','unsubscribed',now());
SET ROLE service_role;
SELECT public.newsletter_referral_service('confirm',jsonb_build_object('token',(:'existing_claim'::jsonb)->>'token','fingerprint',repeat('e',32)));
RESET ROLE;
SELECT pg_temp.check_true((SELECT person_name='Original name' AND consent_text='Original consent' AND status='unsubscribed' FROM public.newsletter_subscriptions WHERE email='existing-race@example.invalid'),'normal subscription/preferences win race');
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE credited)=1,'existing race gives no extra credit');

-- Retry uses the same secret on uncertain failure; confirmed sent mail may be
-- explicitly requested again after cooldown, with a new nonce/idempotency key.
UPDATE public.member_referral_signups SET last_mail_attempt_at=now()-interval '16 minutes',mail_state='failed' WHERE candidate_email='expired@example.invalid';
SET ROLE service_role;
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_b','email','expired@example.invalid','name','Expired','consent',true,'fingerprint',repeat('a',32))) AS retry_claim \gset
SELECT pg_temp.check_true((:'retry_claim'::jsonb)->>'token'=(:'renewed_claim'::jsonb)->>'token','uncertain retry uses same token/idempotency identity');
RESET ROLE;
UPDATE public.member_referral_signups SET last_mail_attempt_at=now()-interval '16 minutes',mail_state='sent' WHERE candidate_email='expired@example.invalid';
SET ROLE service_role;
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_b','email','expired@example.invalid','name','Expired','consent',true,'fingerprint',repeat('a',32))) AS resend_claim \gset
SELECT pg_temp.check_true((:'resend_claim'::jsonb)->>'token'<>(:'retry_claim'::jsonb)->>'token','explicit resend rotates link');
RESET ROLE;
UPDATE public.member_referral_settings SET daily_mail_limit=mail_attempts;
SET ROLE service_role;
SELECT pg_temp.expect_error(format('SELECT public.newsletter_referral_service(%L,%L::jsonb)','register',jsonb_build_object('code',:'code_a','email','over-budget@example.invalid','name','Budget','consent',true,'fingerprint',repeat('a',32))),'referral_mail_limit');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.member_referral_signups WHERE candidate_email='over-budget@example.invalid'),'budget error leaves no partial claim');
UPDATE public.member_referral_settings SET daily_mail_limit=100;
UPDATE public.newsletter_settings SET from_email='';
SET ROLE service_role;
SELECT pg_temp.expect_error(format('SELECT public.newsletter_referral_service(%L,%L::jsonb)','register',jsonb_build_object('code',:'code_a','email','missing-sender@example.invalid','name','Sender','consent',true,'fingerprint',repeat('a',32))),'referral_mail_unavailable');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.member_referral_signups WHERE candidate_email='missing-sender@example.invalid'),'missing sender does not leave a partial claim');
UPDATE public.newsletter_settings SET from_email='Vitale <newsletter@example.invalid>';
UPDATE public.member_referral_signups SET expires_at=now()-interval '9 days' WHERE candidate_email='expired@example.invalid';
SET ROLE service_role;
SELECT public.newsletter_referral_service('register',jsonb_build_object('code',:'code_a','email','suspended-owner@example.invalid','name','Guest','consent',true,'fingerprint',repeat('a',32))) AS suspended_claim \gset
RESET ROLE;
SELECT pg_temp.check_true((SELECT candidate_email IS NULL AND candidate_name IS NULL AND token_hash IS NULL AND status='expired' FROM public.member_referral_signups WHERE email_key=sha256(convert_to('expired@example.invalid','UTF8'))),'expired pending PII cleaned in bounded batch');
UPDATE public.member_profiles SET suspended=true WHERE user_id='00000000-0000-4000-8000-000000000002';
UPDATE public.newsletter_settings SET enabled=false;
SET ROLE service_role;
SELECT public.newsletter_referral_service('confirm',jsonb_build_object('token',(:'suspended_claim'::jsonb)->>'token','fingerprint',repeat('e',32)));
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE credited)=1,'suspended inviter gets no credit');
SELECT pg_temp.check_true((SELECT NOT delivery_enabled FROM public.newsletter_subscriptions WHERE email='suspended-owner@example.invalid'),'confirmation respects paused newsletter delivery');
UPDATE public.member_profiles SET suspended=false WHERE user_id='00000000-0000-4000-8000-000000000002';
UPDATE public.newsletter_settings SET enabled=true;
UPDATE public.member_referral_signups SET confirmed_at=now()-interval '31 days' WHERE credited;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='1' AND public.member_referrals()->'history'='[]','30-day history does not erase historical total');
RESET ROLE;
UPDATE public.member_referral_signups SET confirmed_at=now() WHERE credited;
UPDATE auth.users SET email='new-owner-address@example.invalid' WHERE id='00000000-0000-4000-8000-000000000002';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'code'=:'code_a','code survives auth email change');
RESET ROLE;
UPDATE public.member_referral_settings SET enabled=false;
SET ROLE service_role;
SELECT pg_temp.check_true(public.newsletter_referral_service('visit',jsonb_build_object('code',:'code_a','fingerprint',repeat('a',32)))->>'kind'='disabled','backend kill switch');
RESET ROLE;
UPDATE public.member_referral_settings SET enabled=true;
SET ROLE service_role;
SELECT public.newsletter_referral_service('confirm',jsonb_build_object('token',repeat('0',64),'fingerprint',repeat('f',32))) FROM generate_series(1,30);
SELECT pg_temp.check_true(public.newsletter_referral_service('confirm',jsonb_build_object('token',repeat('0',64),'fingerprint',repeat('f',32)))->>'kind'='rate_limited','invalid token attempts also consume rate limit');
RESET ROLE;
SELECT 'Referral permission, attribution, privacy, budget and lifecycle checks passed.';
