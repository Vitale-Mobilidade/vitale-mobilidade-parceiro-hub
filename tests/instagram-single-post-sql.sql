-- Isolated PostgreSQL fixture only. NEVER run against the integrated database.
CREATE ROLE anon;CREATE ROLE authenticated;CREATE ROLE service_role;
CREATE TABLE public.editorial_admin_memberships(user_id uuid,role text,active boolean);
CREATE TABLE public.editorial_articles(id uuid PRIMARY KEY);
CREATE TABLE public.instagram_carousel_sources(video_id text,article_id uuid);
CREATE TABLE public.instagram_carousel_jobs(video_id text,article_id uuid,state text,publish_attempted boolean);
CREATE TABLE public.podcast_instagram_deliveries(youtube_id text,status text,publish_attempted_at timestamptz);
\i docs/sql/instagram-release/20261114050000_instagram_single_post.sql
INSERT INTO public.editorial_admin_memberships VALUES('00000000-0000-0000-0000-000000000001','admin',true);
INSERT INTO public.editorial_articles VALUES('00000000-0000-0000-0000-000000000002'),('00000000-0000-0000-0000-000000000003');
INSERT INTO public.instagram_carousel_sources VALUES('abcdefghijk','00000000-0000-0000-0000-000000000002'),('oldVideo111','00000000-0000-0000-0000-000000000003');
DO $$DECLARE id uuid;s timestamptz;second timestamptz;j public.instagram_post_jobs;BEGIN
 IF (SELECT generation_enabled OR publishing_enabled OR scheduling_enabled FROM public.instagram_post_settings) THEN RAISE EXCEPTION 'gates_on';END IF;
 UPDATE public.instagram_post_settings SET generation_enabled=true,publishing_enabled=true,scheduling_enabled=true;
 id:=public.enqueue_instagram_post('abcdefghijk','00000000-0000-0000-0000-000000000002','{"videoId":"abcdefghijk","articleId":"00000000-0000-0000-0000-000000000002"}','00000000-0000-0000-0000-000000000001');
 IF id<>public.enqueue_instagram_post('abcdefghijk','00000000-0000-0000-0000-000000000002','{"videoId":"abcdefghijk","articleId":"00000000-0000-0000-0000-000000000002"}','00000000-0000-0000-0000-000000000001') THEN RAISE EXCEPTION 'reenqueue_duplicates';END IF;
 UPDATE public.instagram_post_jobs SET state='approved',approved_revision=1,approved_by='00000000-0000-0000-0000-000000000001',approved_hash=repeat('a',64) WHERE instagram_post_jobs.id=id;
 s:=public.schedule_instagram_post(id,1,'00000000-0000-0000-0000-000000000001',repeat('a',64));
 IF s<=now() OR (s AT TIME ZONE 'America/Sao_Paulo')::time NOT IN(time '06:15',time '11:45',time '17:45') THEN RAISE EXCEPTION 'invalid_window';END IF;
 IF EXISTS(SELECT 1 FROM public.claim_due_instagram_post('00000000-0000-0000-0000-000000000007')) THEN RAISE EXCEPTION 'early_send';END IF;
 second:=public.schedule_instagram_post(id,1,'00000000-0000-0000-0000-000000000001',repeat('a',64));
 IF second<=s OR (SELECT count(*) FROM public.instagram_post_slots)<>2 THEN RAISE EXCEPTION 'slot_reused';END IF;
 PERFORM public.schedule_instagram_post(id,1,'00000000-0000-0000-0000-000000000001',repeat('a',64),true);
 IF (SELECT state FROM public.instagram_post_jobs WHERE instagram_post_jobs.id=id)<>'approved' THEN RAISE EXCEPTION 'cancel_failed';END IF;
 SELECT * INTO j FROM public.claim_instagram_post(id,1,'00000000-0000-0000-0000-000000000006');
 IF j.id IS NULL OR EXISTS(SELECT 1 FROM public.claim_instagram_post(id,1,'00000000-0000-0000-0000-000000000007')) THEN RAISE EXCEPTION 'concurrent_claim';END IF;
 INSERT INTO public.podcast_instagram_deliveries VALUES('oldVideo111','published',now());
 IF NOT public.instagram_post_seen('oldVideo111','00000000-0000-0000-0000-000000000003') THEN RAISE EXCEPTION 'old_topic_not_deduped';END IF;
 BEGIN PERFORM public.enqueue_instagram_post('oldVideo111','00000000-0000-0000-0000-000000000003','{"videoId":"oldVideo111","articleId":"00000000-0000-0000-0000-000000000003"}','00000000-0000-0000-0000-000000000001');RAISE EXCEPTION 'old_topic_allowed';EXCEPTION WHEN OTHERS THEN IF SQLERRM='old_topic_allowed' THEN RAISE;END IF;END;
 BEGIN PERFORM public.schedule_instagram_post(id,1,'00000000-0000-0000-0000-000000000009',repeat('a',64));RAISE EXCEPTION 'nonadmin_allowed';EXCEPTION WHEN OTHERS THEN IF SQLERRM='nonadmin_allowed' THEN RAISE;END IF;END;
 RAISE NOTICE 'Isolated enqueue/dedupe/windows/claim/cancel/admin tests passed';
END $$;