\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$ DECLARE failed boolean:=false; BEGIN BEGIN EXECUTE statement; EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % (wanted %)',SQLERRM,fragment; END IF; failed:=true; END; IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment; END IF; END $$;
SET ROLE anon;
SELECT pg_temp.expect_error('SELECT public.member_community_account()','permission denied');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT public.member_community_account(''join'')','community_consent_required');
SELECT pg_temp.expect_error('SELECT public.member_referrals()','community_join_required');
SELECT pg_temp.check_true(public.member_community_account()->>'communityJoinedAt' IS NULL,'old profile is not automatically a community member');
SELECT public.member_community_account('join','{"displayName":"Membro A","acknowledged":true}');
SELECT public.member_referrals()->>'code' AS code_a \gset
SELECT pg_temp.check_true(public.member_community_account()->>'communityJoinedAt' IS NOT NULL,'explicit combined adhesion completes membership');
SELECT pg_temp.check_true((public.member_community_account()->>'newsletterSubscribed')::boolean,'membership includes active newsletter');
SELECT public.member_community_account('join');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.newsletter_subscriptions WHERE email='new-owner-address@example.invalid')=1,'repeated login does not duplicate newsletter');
SELECT consent_at AS first_consent FROM public.newsletter_subscriptions WHERE email='new-owner-address@example.invalid' \gset
UPDATE public.newsletter_subscriptions SET status='unsubscribed',suppressed_at=now() WHERE email='new-owner-address@example.invalid';
SET ROLE authenticated;
SELECT public.member_community_account('join','{"acknowledged":true}');
SELECT public.member_community('save_profile','{"displayName":"Nome alterado","privacyAcknowledged":true}');
SELECT pg_temp.check_true(NOT (public.member_community_account()->>'newsletterSubscribed')::boolean,'login/profile editing preserve a later unsubscribe');
RESET ROLE;
SELECT pg_temp.check_true((SELECT consent_at=:'first_consent'::timestamptz FROM public.newsletter_subscriptions WHERE email='new-owner-address@example.invalid'),'login does not fabricate a new consent timestamp');

INSERT INTO public.newsletter_subscriptions(person_name,email,status,suppressed_at,consent_text,consent_version) VALUES('B antigo','b@example.invalid','unsubscribed',now(),'aceite anterior','v2');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SET ROLE authenticated;
SELECT public.member_community_account('join','{"displayName":"Membro B","acknowledged":true}');
SELECT public.member_referrals()->>'code' AS code_b \gset
SELECT pg_temp.check_true((public.member_community_account()->>'newsletterSubscribed')::boolean,'first explicit community adhesion can renew old newsletter consent');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.newsletter_subscriptions WHERE email='b@example.invalid')=1,'existing newsletter row reused');

INSERT INTO auth.users(id,email,email_confirmed_at,is_anonymous,raw_user_meta_data,created_at) VALUES
('00000000-0000-4000-8000-000000000007','new-member@example.invalid',null,false,jsonb_build_object('display_name','Novo membro','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'code_a'),now()),
('00000000-0000-4000-8000-000000000008','old-newsletter@example.invalid',now(),false,jsonb_build_object('display_name','Leitor antigo','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'code_a'),now()),
('00000000-0000-4000-8000-000000000009','no-consent@example.invalid',now(),false,jsonb_build_object('display_name','Sem aceite','community_consent_version','2026-11-03','community_newsletter_consent','true','role','admin'),now()),
('00000000-0000-4000-8000-000000000010','expired-pending@example.invalid',null,false,jsonb_build_object('display_name','Pendente antigo','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'code_a'),now()-interval '49 hours'),
('00000000-0000-4000-8000-000000000011','concurrent-member@example.invalid',now(),false,jsonb_build_object('display_name','Membro concorrente','community_consent_version','2026-11-03','community_newsletter_consent',true,'community_invitation_code',:'code_a'),now());
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'pending'='1','pending metric comes from unconfirmed Auth, with bounded age');
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='0','old newsletter-only referrals are not new community members');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000007',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT public.member_community_account(''join'')','email_confirmation_required');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.newsletter_subscriptions WHERE email='new-member@example.invalid'),'unconfirmed signup is not subscribed');
UPDATE auth.users SET email_confirmed_at=now() WHERE id='00000000-0000-4000-8000-000000000007';
SET ROLE authenticated;
SELECT public.member_community_account('join');
SELECT public.member_community_account('join');
SELECT pg_temp.check_true((public.member_community_account()->>'newsletterSubscribed')::boolean,'Auth confirmation and first login complete account/newsletter together');
SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Participo da comunidade"}');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE invitee_user_id='00000000-0000-4000-8000-000000000007' AND community_member AND credited)=1,'one member gets one referral credit');
UPDATE auth.users SET raw_user_meta_data=jsonb_set(raw_user_meta_data,'{community_invitation_code}',to_jsonb(:'code_b'::text)) WHERE id='00000000-0000-4000-8000-000000000007';
SET ROLE authenticated;
SELECT public.member_community_account('join','{"invitationCode":"ffffffffffffffffffffffffffffffff","acknowledged":true}');
RESET ROLE;
SELECT pg_temp.check_true((SELECT referrer_id='00000000-0000-4000-8000-000000000002' FROM public.member_referral_signups WHERE invitee_user_id='00000000-0000-4000-8000-000000000007'),'later metadata/login cannot change first attribution');

INSERT INTO public.newsletter_subscriptions(person_name,email,status,consent_text,consent_version) VALUES('Já lia a newsletter','old-newsletter@example.invalid','interested','aceite anterior','v2');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000008',false);
SET ROLE authenticated;
SELECT public.member_community_account('join');
RESET ROLE;
SELECT pg_temp.check_true((SELECT count(*) FROM public.newsletter_subscriptions WHERE email='old-newsletter@example.invalid')=1,'old newsletter reader does not get duplicate subscription');
SELECT pg_temp.check_true((SELECT count(*) FROM public.member_referral_signups WHERE invitee_user_id='00000000-0000-4000-8000-000000000008' AND credited AND community_member)=1,'old newsletter reader can be a genuinely new community member');
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000009',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error('SELECT public.member_community_account(''join'')','community_consent_required');
SELECT public.member_community('save_profile','{"displayName":"Perfil incompleto","privacyAcknowledged":true}');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Tentativa sem adesao"}')$q$,'community_join_required');
RESET ROLE;
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.newsletter_subscriptions WHERE email='no-consent@example.invalid'),'string flag or forged role cannot subscribe without combined consent');
SELECT pg_temp.check_true(NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id='00000000-0000-4000-8000-000000000009'),'metadata does not create an admin');

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_referrals()->>'confirmed'='2','owner sees newly joined members, not newsletter-only recipients');
SELECT pg_temp.check_true(public.member_referrals()->>'pending'='0','confirmed Auth leaves pending count');
SELECT pg_temp.check_true(NOT (public.member_referrals() ?| ARRAY['email','invitee_user_id','raw_user_meta_data']),'dashboard stays aggregate-only');
RESET ROLE;
SET ROLE service_role;
SELECT pg_temp.check_true(public.newsletter_referral_service('register','{}')->>'kind'='unattributed','separate newsletter referral registration disabled');
SELECT pg_temp.check_true(public.newsletter_referral_service('confirm','{}')->>'kind'='invalid','second email confirmation disabled');
SELECT public.newsletter_referral_service('visit',jsonb_build_object('code',:'code_a','fingerprint',repeat('8',32)));
RESET ROLE;
SELECT 'Unified membership, consent, newsletter, comments and invitation checks passed.';
