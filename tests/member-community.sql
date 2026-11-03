\set ON_ERROR_STOP on
CREATE FUNCTION pg_temp.check_true(v boolean, label text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %', label; END IF; END $$;
CREATE FUNCTION pg_temp.expect_error(statement text, fragment text) RETURNS void LANGUAGE plpgsql AS $$
DECLARE failed boolean := false;
BEGIN
  BEGIN EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected error: % (wanted %)', SQLERRM,fragment; END IF;
    failed := true;
  END;
  IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment; END IF;
END $$;

SELECT pg_temp.check_true(NOT (public.member_community('status')->>'enabled')::boolean,'disabled by default');
SELECT pg_temp.expect_error($q$SELECT public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')$q$,'community_disabled');
UPDATE public.member_community_settings SET enabled=true;
SET ROLE anon;
SELECT pg_temp.expect_error('SELECT * FROM public.member_profiles','permission denied');
SELECT pg_temp.expect_error('SELECT * FROM public.member_article_comments','permission denied');
SELECT pg_temp.expect_error('UPDATE public.member_community_settings SET enabled=true','permission denied');
SELECT pg_temp.expect_error($q$SELECT public.member_community('save_profile','{"displayName":"Visitante","privacyAcknowledged":true}')$q$,'email_confirmation_required');
SELECT pg_temp.expect_error($q$SELECT public.member_community('moderation_list')$q$,'forbidden');
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','empty public list');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.member_community('save_profile','{"displayName":"Unconfirmed","privacyAcknowledged":true}')$q$,'email_confirmation_required');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000005',false);
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.member_community('save_profile','{"displayName":"Anonymous Auth","privacyAcknowledged":true}')$q$,'email_confirmation_required');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_community('profile')='null','no preexisting profile required');
SELECT pg_temp.expect_error($q$SELECT public.member_community('save_profile','{"displayName":"Leitor"}')$q$,'privacy_required');
SELECT pg_temp.expect_error($q$SELECT public.member_community('save_profile','{"displayName":"X","privacyAcknowledged":true}')$q$,'invalid_name');
SELECT pg_temp.check_true(public.member_community('save_profile','{"displayName":"Leitor A","privacyAcknowledged":true,"role":"admin","userId":"00000000-0000-4000-8000-000000000001"}')->>'displayName'='Leitor A','profile cannot forge user or admin');
SELECT pg_temp.expect_error('SELECT * FROM public.editorial_admin_memberships','permission denied');
SELECT pg_temp.expect_error('UPDATE public.member_profiles SET suspended=false','permission denied');
SELECT pg_temp.expect_error($q$SELECT public.member_community('moderation_list')$q$,'forbidden');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000002","body":"Draft attack"}')$q$,'article_unavailable');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"  "}')$q$,'invalid_comment');
SELECT pg_temp.check_true((public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"<script>alert(1)</script> dúvida","status":"approved"}')->>'ok')::boolean,'comment accepted into moderation');
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')->0->>'status'='pending','client cannot self approve');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Too soon"}')$q$,'comment_rate_limited');
RESET ROLE;
SELECT id AS comment_id FROM public.member_article_comments LIMIT 1 \gset
SELECT pg_temp.check_true((SELECT count(*) FROM public.editorial_admin_memberships)=1,'no added admin membership');
INSERT INTO public.editorial_admin_memberships(user_id,active,role) VALUES('00000000-0000-4000-8000-000000000003',false,'admin');

SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','pending private to public');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_community('profile')='null','other profile private');
SELECT public.member_community('save_profile','{"displayName":"Leitor B","privacyAcknowledged":true}');
SELECT pg_temp.expect_error($q$SELECT public.member_community('moderation_list')$q$,'forbidden');
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','pending private to other reader');
SELECT pg_temp.expect_error(format('SELECT public.member_community(%L,%L::jsonb)','remove_comment',jsonb_build_object('id',:'comment_id')),'comment_unavailable');
SELECT pg_temp.expect_error(format('SELECT public.member_community(%L,%L::jsonb)','moderate',jsonb_build_object('id',:'comment_id','status','approved')),'forbidden');
RESET ROLE;
UPDATE public.editorial_admin_memberships SET active=true,role='content' WHERE user_id='00000000-0000-4000-8000-000000000003';
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.member_community('moderation_list')$q$,'forbidden');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(jsonb_array_length(public.member_community('moderation_list'))=1,'admin queue includes pending');
SELECT pg_temp.expect_error(format('SELECT public.member_community(%L,%L::jsonb)','moderate',jsonb_build_object('id',:'comment_id','status','removed')),'invalid_input');
SELECT public.member_community('moderate',jsonb_build_object('id',:'comment_id','status','approved'));
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT pg_temp.check_true(jsonb_array_length(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}'))=1,'approved visible to anon');
SELECT pg_temp.check_true(NOT (public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')->0 ?| ARRAY['user_id','email','moderated_by','userId']),'no author identity or email in projection');
SELECT pg_temp.expect_error($q$SELECT public.member_community('comments','{"offset":-1}')$q$,'invalid_input');
SELECT pg_temp.expect_error($q$SELECT public.member_community('comments','{"offset":10001}')$q$,'invalid_input');
SELECT pg_temp.expect_error($q$SELECT public.member_community('anything','[]')$q$,'invalid_input');
RESET ROLE;

SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SET ROLE authenticated;
SELECT public.member_community('suspend_author',jsonb_build_object('id',:'comment_id','suspended',true));
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','suspension hides approved');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true((public.member_community('save_profile','{"displayName":"Novo nome","privacyAcknowledged":true,"suspended":false}')->>'suspended')::boolean,'saving profile cannot lift suspension');
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')->0->>'authorName'='Leitor A','profile edit cannot replace approved name');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Suspended"}')$q$,'account_suspended');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
SET ROLE authenticated;
SELECT public.member_community('suspend_author',jsonb_build_object('id',:'comment_id','suspended',false));
SELECT public.member_community('moderate',jsonb_build_object('id',:'comment_id','status','rejected'));
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','rejected private');
RESET ROLE;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')->0->>'status'='rejected','author can see rejection');
SELECT public.member_community('remove_comment',jsonb_build_object('id',:'comment_id'));
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','removed invisible even to author');
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Delete bypass"}')$q$,'comment_rate_limited');
RESET ROLE;
SELECT pg_temp.check_true((SELECT body='[removido]' FROM public.member_article_comments WHERE id=:'comment_id'),'removed body erased');
SELECT pg_temp.check_true((SELECT count(*)=4 FROM public.member_moderation_audit),'moderation audit recorded');

UPDATE public.member_profiles SET last_comment_at=now()-interval '2 minutes',comment_day=(now() AT TIME ZONE 'America/Sao_Paulo')::date,comment_day_count=20 WHERE user_id='00000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
SELECT pg_temp.expect_error($q$SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Daily bypass"}')$q$,'comment_rate_limited');
RESET ROLE;
UPDATE public.member_profiles SET last_comment_at=now()-interval '2 minutes',comment_day=(now() AT TIME ZONE 'America/Sao_Paulo')::date-1,comment_day_count=20 WHERE user_id='00000000-0000-4000-8000-000000000002';
SET ROLE authenticated;
SELECT public.member_community('add_comment','{"articleId":"10000000-0000-4000-8000-000000000001","body":"Next calendar day"}');
RESET ROLE;
SELECT pg_temp.check_true((SELECT comment_day_count=1 FROM public.member_profiles WHERE user_id='00000000-0000-4000-8000-000000000002'),'Sao Paulo calendar counter reset');
UPDATE public.editorial_articles SET status='draft';
SET ROLE authenticated;
SELECT pg_temp.check_true(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}')='[]','unpublished article hides comments');
RESET ROLE;
UPDATE public.editorial_articles SET status='published' WHERE id='10000000-0000-4000-8000-000000000001';
UPDATE public.member_profiles SET last_comment_at=NULL,comment_day_count=0 WHERE user_id='00000000-0000-4000-8000-000000000002';
INSERT INTO public.member_article_comments(article_id,user_id,author_name,body,status)
SELECT '10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000003','Leitor B','Paginated comment '||n,'approved' FROM generate_series(1,25) n;
SELECT set_config('request.jwt.claim.sub','',false);
SET ROLE anon;
SELECT pg_temp.check_true(jsonb_array_length(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001"}'))=21,'bounded page with next-page sentinel');
SELECT pg_temp.check_true(jsonb_array_length(public.member_community('comments','{"articleId":"10000000-0000-4000-8000-000000000001","offset":20}'))=5,'second page');
RESET ROLE;
SELECT 'All database permission and workflow checks passed.';
