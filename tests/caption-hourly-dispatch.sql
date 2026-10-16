\ir youtube-stall-alert.sql
\ir ../supabase/migrations/20261015230000_caption_hourly_retry.sql
\ir ../supabase/migrations/20261015231500_caption_retry_dispatch.sql
TRUNCATE youtube_editorial_sources,youtube_editorial_inventory,editorial_articles,editorial_audit_logs,net.http_request_queue;
UPDATE youtube_editorial_worker_settings SET enabled=true;
INSERT INTO youtube_editorial_sources(video_id,state,caption_retry_at,caption_retry_bike_ids) VALUES('wait0000000','needs_review',now()-interval '1 minute',ARRAY['v29_pro']);
SELECT assert_true(dispatch_youtube_editorial_tick('youtube-drain')=1,'due caption wait wakes existing drain');
UPDATE youtube_editorial_sources SET caption_retry_at=now()+interval '1 hour';
SELECT assert_true(dispatch_youtube_editorial_tick('youtube-drain') IS NULL,'future caption wait does not poll');
UPDATE youtube_editorial_sources SET caption_retry_at=now()-interval '1 minute',capture='{}';
SELECT assert_true(dispatch_youtube_editorial_tick('youtube-drain') IS NULL,'saved capture cannot wake retry');
UPDATE youtube_editorial_sources SET capture=null,article_id='00000000-0000-0000-0000-000000000001';
SELECT assert_true(dispatch_youtube_editorial_tick('youtube-drain') IS NULL,'saved article cannot wake retry');
