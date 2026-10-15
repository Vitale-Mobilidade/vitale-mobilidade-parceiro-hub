-- Isolated PostgreSQL database only.
CREATE TABLE youtube_editorial_sources(video_id text primary key,state text,capture jsonb,article_id uuid);
\ir ../supabase/migrations/20261015230000_caption_hourly_retry.sql
CREATE FUNCTION assert_true(v boolean) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'assertion failed'; END IF; END $$;
INSERT INTO youtube_editorial_sources VALUES
 ('due','needs_review',null,null,now()-interval '1 minute',ARRAY['v29_pro','v20_ultra','v9_max_s']),
 ('future','needs_review',null,null,now()+interval '59 minutes',null),
 ('captured','needs_review','{}',null,now()-interval '1 minute',null),
 ('article','needs_review',null,'00000000-0000-0000-0000-000000000001',now()-interval '1 minute',null),
 ('active','capturing',null,null,now()-interval '1 minute',null),
 ('done','done',null,null,now()-interval '1 minute',null);
SELECT assert_true((SELECT array_agg(video_id)=ARRAY['due'] FROM youtube_editorial_sources WHERE state='needs_review' AND capture IS NULL AND article_id IS NULL AND caption_retry_at<=now()));
SELECT assert_true((SELECT caption_retry_bike_ids=ARRAY['v29_pro','v20_ultra','v9_max_s'] FROM youtube_editorial_sources WHERE video_id='due'));
UPDATE youtube_editorial_sources SET caption_retry_at=now()+interval '1 hour' WHERE video_id='due';
SELECT assert_true((SELECT count(*)=0 FROM youtube_editorial_sources WHERE state='needs_review' AND capture IS NULL AND article_id IS NULL AND caption_retry_at<=now()));
