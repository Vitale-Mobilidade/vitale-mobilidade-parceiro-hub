-- Run only in an isolated local PostgreSQL test database.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA net;
CREATE TABLE net.http_request_queue(url text);
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE TABLE public.youtube_editorial_sources(video_id text PRIMARY KEY,state text,capture jsonb,article_id uuid,created_at timestamptz DEFAULT now());
CREATE TABLE public.editorial_compiler_runs(article_id uuid,status text,error_code text,started_at timestamptz,completed_at timestamptz);
CREATE TABLE public.editorial_audit_logs(entity_type text,entity_id text,action text,created_at timestamptz DEFAULT now());
CREATE TABLE public.youtube_editorial_inventory(video_id text,historical boolean);
CREATE TABLE public.editorial_articles(id uuid,video_id text,status text);
CREATE TABLE public.youtube_editorial_worker_settings(singleton boolean,enabled boolean,actor_id uuid,signing_key bytea);
INSERT INTO youtube_editorial_worker_settings VALUES(true,true,NULL,extensions.gen_random_bytes(32));
INSERT INTO youtube_editorial_sources VALUES('old00000000','generating','{"originalVtt":"WEBVTT preserved"}','00000000-0000-0000-0000-000000000001',now()-interval '1 hour');
INSERT INTO editorial_compiler_runs VALUES('00000000-0000-0000-0000-000000000001','running',NULL,now()-interval '40 minutes',NULL);
\ir ../supabase/migrations/20261013180000_youtube_stall_alert.sql
CREATE FUNCTION public.assert_true(ok boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %',label; END IF; END $$;
SELECT assert_true((SELECT state_changed_at<now()-interval '39 minutes' FROM youtube_editorial_sources WHERE video_id='old00000000'),'backfill uses interrupted compiler start');
SELECT assert_true(NOT has_function_privilege('anon','public.reconcile_youtube_editorial_stalls()','EXECUTE'),'anonymous denied');
SELECT assert_true(NOT has_function_privilege('authenticated','public.reconcile_youtube_editorial_stalls()','EXECUTE'),'authenticated denied');
SELECT assert_true(has_function_privilege('service_role','public.reconcile_youtube_editorial_stalls()','EXECUTE'),'service role allowed');
SELECT assert_true(dispatch_youtube_editorial_tick('youtube-drain')=1,'stalled job wakes drain without pending inventory');
INSERT INTO youtube_editorial_sources(video_id,state,capture,article_id,state_changed_at) VALUES
 ('fresh000000','generating','{}',NULL,now()-interval '2 minutes'),
 ('done0000000','done','{}',NULL,now()-interval '1 hour'),
 ('wait0000000','rewrite_pending','{}',NULL,now()-interval '1 hour'),
 ('cover000000','cover_generating','{}',NULL,now()-interval '16 minutes'),
 ('render00000','cover_rendering','{}',NULL,now()-interval '16 minutes'),
 ('publish0000','publishing','{}',NULL,now()-interval '16 minutes'),
 ('capture0000','capturing',NULL,NULL,now()-interval '16 minutes');
SELECT assert_true(jsonb_array_length(reconcile_youtube_editorial_stalls())=5,'all five active stalled stages return alerts');
SELECT assert_true((SELECT count(*)=5 FROM youtube_editorial_sources WHERE state='needs_review'),'only stalled active stages transition');
SELECT assert_true((SELECT status='failed' AND error_code='automatic_stage_interrupted' AND completed_at IS NOT NULL FROM editorial_compiler_runs),'interrupted run closes');
SELECT assert_true((SELECT capture->>'originalVtt'='WEBVTT preserved' FROM youtube_editorial_sources WHERE video_id='old00000000'),'source content preserved');
SELECT assert_true((SELECT state='generating' FROM youtube_editorial_sources WHERE video_id='fresh000000'),'recent stage preserved');
SELECT assert_true((SELECT state='done' FROM youtube_editorial_sources WHERE video_id='done0000000'),'completed stage preserved');
SELECT assert_true((SELECT state='rewrite_pending' FROM youtube_editorial_sources WHERE video_id='wait0000000'),'paid work never replayed');
INSERT INTO editorial_audit_logs(entity_type,entity_id,action) SELECT 'video',video_id,'editorial_alert_sent' FROM youtube_editorial_sources WHERE state='needs_review' AND video_id<>'old00000000';
INSERT INTO editorial_audit_logs VALUES('video','old00000000','editorial_alert_failed',now());
SELECT assert_true(reconcile_youtube_editorial_stalls()='[]'::jsonb,'sent alerts suppressed and failed alerts back off');
UPDATE editorial_audit_logs SET created_at=now()-interval '11 minutes' WHERE action='editorial_alert_failed';
SELECT assert_true(jsonb_array_length(reconcile_youtube_editorial_stalls())=1,'failed delivery retried after backoff');
INSERT INTO editorial_audit_logs VALUES('video','old00000000','editorial_alert_sent',now());
SELECT assert_true(reconcile_youtube_editorial_stalls()='[]'::jsonb,'successful retry suppresses further alerts');
UPDATE youtube_editorial_sources SET state='done' WHERE video_id='wait0000000';
SELECT assert_true((SELECT state_changed_at>now()-interval '1 minute' FROM youtube_editorial_sources WHERE video_id='wait0000000'),'state change updates lease timestamp');
UPDATE youtube_editorial_sources SET capture='{"updated":true}' WHERE video_id='fresh000000';
SELECT assert_true((SELECT state_changed_at<now()-interval '1 minute' FROM youtube_editorial_sources WHERE video_id='fresh000000'),'payload writes do not extend stale lease');
UPDATE youtube_editorial_sources SET state='done' WHERE video_id='old00000000';
UPDATE youtube_editorial_sources SET state='generating' WHERE video_id='old00000000';
UPDATE youtube_editorial_sources SET state_changed_at=now()-interval '16 minutes' WHERE video_id='old00000000';
SELECT assert_true(jsonb_array_length(reconcile_youtube_editorial_stalls())=1,'later stall episode can notify again');
UPDATE youtube_editorial_worker_settings SET enabled=false;
SELECT assert_true(dispatch_youtube_editorial_tick('youtube-drain') IS NULL,'disabled worker stays disabled');
SELECT 'PASS: watchdog SQL behavior and permissions';
