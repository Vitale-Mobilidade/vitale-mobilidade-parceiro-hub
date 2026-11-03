\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$ DECLARE failed boolean:=false; BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % (wanted %)',SQLERRM,fragment; END IF; failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment; END IF; END $$;
SELECT code AS owner_code FROM public.member_referral_links WHERE user_id='00000000-0000-4000-8000-000000000002' \gset
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data,created_at) VALUES
('00000000-0000-4000-8000-000000000012','cancelled-before-community@example.invalid',now(),false,jsonb_build_object('display_name','Acesso imediato','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'owner_code'),now()),
('00000000-0000-4000-8000-000000000013','immediate-new-member@example.invalid',now(),false,jsonb_build_object('display_name','Novo cadastro','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'owner_code'),now()),
('00000000-0000-4000-8000-000000000015','active-before-community@example.invalid',now(),false,jsonb_build_object('display_name','Nome da comunidade','community_consent_version','2026-11-03','community_newsletter_consent',true),now());
INSERT INTO public.newsletter_subscriptions(person_name,email,status,suppressed_at,interest,consent_text,consent_version,consent_at) VALUES
('Pedido anterior','cancelled-before-community@example.invalid','unsubscribed',now(),'radar','consentimento anterior','v2',now()-interval '7 days'),
('Nome anterior','active-before-community@example.invalid','interested',null,'radar','consentimento anterior','v2',now()-interval '7 days');
SELECT consent_at AS cancelled_consent FROM public.newsletter_subscriptions WHERE email='cancelled-before-community@example.invalid' \gset
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000012',false);
SET ROLE authenticated;
SELECT public.member_community_account('join');
SELECT pg_temp.check_true(public.member_community_account()->>'communityJoinedAt' IS NOT NULL,'cancelled reader still joins community immediately');
SELECT pg_temp.check_true(NOT (public.member_community_account()->>'newsletterSubscribed')::boolean,'unverified signup cannot undo earlier unsubscribe');
RESET ROLE;
SELECT pg_temp.check_true((SELECT status='unsubscribed' AND suppressed_at IS NOT NULL AND NOT delivery_enabled AND consent_at=:'cancelled_consent'::timestamptz FROM public.newsletter_subscriptions WHERE email='cancelled-before-community@example.invalid'),'old cancellation and consent remain intact');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000013',false);
SET ROLE authenticated;
SELECT public.member_community_account('join');
SELECT public.member_community_account('join');
SELECT pg_temp.check_true((public.member_community_account()->>'newsletterSubscribed')::boolean,'native auto-confirm session completes newsletter without separate email confirmation');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.newsletter_subscriptions WHERE email='immediate-new-member@example.invalid')=1,'immediate signup idempotent');
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE invitee_user_id='00000000-0000-4000-8000-000000000013' AND community_member AND credited)=1,'immediate member counts exactly once');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000015',false);
SET ROLE authenticated;
SELECT public.member_community_account('join');
RESET ROLE;
SELECT pg_temp.check_true((SELECT person_name='Nome anterior' AND interest='radar' AND consent_text='consentimento anterior' FROM public.newsletter_subscriptions WHERE email='active-before-community@example.invalid'),'existing newsletter preferences and name untouched without mailbox proof');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SELECT (public.member_referrals()->>'pending')::integer AS baseline_pending \gset
INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data,created_at) VALUES
('00000000-0000-4000-8000-000000000014','adhesion-retry@example.invalid',now(),false,jsonb_build_object('display_name','Adesão pendente','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'owner_code'),now());
SET ROLE authenticated;
SELECT pg_temp.check_true((public.member_referrals()->>'pending')::integer=:'baseline_pending'::integer+1,'pending is unfinished adhesion, not waiting for email');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000014',false);
SET ROLE authenticated;
SELECT public.member_community_account('join');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true((public.member_referrals()->>'pending')::integer=:'baseline_pending'::integer,'completed adhesion leaves pending count');
SELECT pg_temp.expect_error($q$SELECT public.member_password_recovery_budget('a@example.invalid',repeat('a',32))$q$,'permission denied');
RESET ROLE;
SET ROLE anon;
SELECT pg_temp.expect_error($q$SELECT public.member_password_recovery_budget('a@example.invalid',repeat('a',32))$q$,'permission denied');
RESET ROLE;
UPDATE public.member_community_settings SET enabled=false;
SET ROLE service_role;
SELECT pg_temp.check_true(NOT public.member_password_recovery_budget('a@example.invalid',repeat('a',32)),'disabled community cannot spend recovery emails');
RESET ROLE;
UPDATE public.member_community_settings SET enabled=true;
SET ROLE service_role;
SELECT pg_temp.expect_error($q$SELECT public.member_password_recovery_budget('BAD',repeat('a',32))$q$,'invalid_input');
SELECT pg_temp.check_true(public.member_password_recovery_budget('a@example.invalid',repeat('a',32)),'first recovery allowed');
SELECT pg_temp.check_true(public.member_password_recovery_budget('a@example.invalid',repeat('a',32)),'second recovery allowed');
SELECT pg_temp.check_true(NOT public.member_password_recovery_budget('a@example.invalid',repeat('a',32)),'email recovery cap enforced');
SELECT pg_temp.check_true(public.member_password_recovery_budget('b@example.invalid',repeat('a',32)),'fourth IP request allowed');
SELECT pg_temp.check_true(public.member_password_recovery_budget('c@example.invalid',repeat('a',32)),'fifth IP request allowed');
SELECT pg_temp.check_true(NOT public.member_password_recovery_budget('d@example.invalid',repeat('a',32)),'IP cap enforced across different emails');
RESET ROLE;
UPDATE public.newsletter_throttle SET attempts=20 WHERE fingerprint='member-recovery:global-hour';
SET ROLE service_role;
SELECT pg_temp.check_true(NOT public.member_password_recovery_budget('new@example.invalid',repeat('b',32)),'global hourly quota enforced');
RESET ROLE;
UPDATE public.newsletter_throttle SET attempts=50 WHERE fingerprint='member-recovery:global-day';
SET ROLE service_role;
SELECT pg_temp.check_true(NOT public.member_password_recovery_budget('new@example.invalid',repeat('b',32)),'global daily quota enforced');
RESET ROLE;
UPDATE public.newsletter_throttle SET attempts=0,window_started_at=now()-interval '25 hours' WHERE fingerprint LIKE 'member-recovery:%';
SET ROLE service_role;
SELECT pg_temp.check_true(public.member_password_recovery_budget('parallel@example.invalid',repeat('c',32)),'expired quota window resets');
RESET ROLE;
SELECT 'Immediate signup, existing unsubscribe, private referrals and recovery budgets passed.';
