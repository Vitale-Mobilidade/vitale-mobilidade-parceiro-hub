\set ON_ERROR_STOP on
DO $$BEGIN
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon; END IF;
 IF NOT EXISTS(SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated; END IF;
END $$;
CREATE TABLE public.podcast_instagram_deliveries(youtube_id text,status text);
CREATE TABLE public.instagram_carousel_jobs(video_id text,article_id uuid,state text);
CREATE TABLE public.podcast_episode_queue(youtube_id text,prepared_instagram_post jsonb);
\ir ../docs/sql/instagram-release/20261114074000_single_image_increment.sql
DO $$DECLARE id uuid:='11111111-1111-4111-8111-111111111111'; token uuid:='22222222-2222-4222-8222-222222222222'; n integer;
BEGIN
 IF has_table_privilege('anon','public.instagram_single_posts','SELECT') OR has_function_privilege('authenticated','public.claim_instagram_single_post(uuid,integer,uuid)','EXECUTE') THEN RAISE EXCEPTION 'permissions open'; END IF;
 INSERT INTO public.instagram_single_posts(id,video_id,article_id) VALUES(id,'held','33333333-3333-4333-8333-333333333333');
 INSERT INTO public.podcast_episode_queue VALUES('held','{"reviewHold":true}');
 SELECT count(*) INTO n FROM public.claim_instagram_single_post(id,1,token);IF n<>0 THEN RAISE EXCEPTION 'OUXI hold bypass'; END IF;
 DELETE FROM public.podcast_episode_queue WHERE youtube_id='held';
 SELECT count(*) INTO n FROM public.claim_instagram_single_post(id,1,token);IF n<>1 THEN RAISE EXCEPTION 'first lease fails'; END IF;
 SELECT count(*) INTO n FROM public.claim_instagram_single_post(id,1,gen_random_uuid());IF n<>0 THEN RAISE EXCEPTION 'concurrent lease bypass'; END IF;
 UPDATE public.instagram_single_posts SET lease_until=now()-interval '1 minute',create_attempted=true WHERE video_id='held';
 SELECT count(*) INTO n FROM public.claim_instagram_single_post(id,1,token);IF n<>0 THEN RAISE EXCEPTION 'uncertain replay'; END IF;
 UPDATE public.instagram_single_posts SET create_attempted=false WHERE video_id='held';
 INSERT INTO public.podcast_instagram_deliveries VALUES('held','published');
 SELECT count(*) INTO n FROM public.claim_instagram_single_post(id,1,token);IF n<>0 THEN RAISE EXCEPTION 'legacy repeat'; END IF;
 IF EXISTS(SELECT 1 FROM public.instagram_single_settings WHERE generation_enabled OR publishing_enabled OR automation_enabled) THEN RAISE EXCEPTION 'gates active'; END IF;
END $$;