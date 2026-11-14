#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
scratch="$(mktemp -d /tmp/vt-ig-ops.XXXXXX)"
trap 'pg_ctl -D "$scratch/db" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$scratch"' EXIT
initdb -D "$scratch/db" -U postgres --auth-local=trust --auth-host=reject >/dev/null
pg_ctl -D "$scratch/db" -l "$scratch/postgres.log" -o "-c listen_addresses= -k $scratch" start >/dev/null
db=(psql -X -q -h "$scratch" -d postgres -U postgres -v ON_ERROR_STOP=1)
"${db[@]}" <<'SQL'
CREATE ROLE anon;
CREATE ROLE authenticated;
CREATE ROLE service_role BYPASSRLS;
CREATE ROLE sandbox_exec;
CREATE SCHEMA extensions;
CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA cron;
CREATE FUNCTION cron.schedule(text,text,text) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE SCHEMA net;
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
CREATE TABLE podcast_worker_credentials(singleton boolean,signing_key bytea);
INSERT INTO podcast_worker_credentials VALUES(true,extensions.gen_random_bytes(32));
CREATE TABLE podcast_distribution_settings(singleton boolean,instagram_enabled boolean);
INSERT INTO podcast_distribution_settings VALUES(true,false);
CREATE TABLE instagram_carousel_settings(singleton boolean,publishing_enabled boolean);
INSERT INTO instagram_carousel_settings VALUES(true,false);
CREATE TABLE podcast_episode_queue(youtube_id text, prepared_instagram_post jsonb);
CREATE TABLE podcast_instagram_deliveries(youtube_id text,status text);
CREATE TABLE instagram_carousel_jobs(video_id text, article_id uuid,state text);
CREATE TABLE instagram_carousel_sources(video_id text, article_id uuid);
SQL
"${db[@]}" -1 -f docs/sql/instagram-release/20261114085000_single_image_operations.sql
"${db[@]}" <<'SQL'
INSERT INTO instagram_single_posts(id,video_id,article_id,title,caption,asset_path,fingerprint)
VALUES ('00000000-0000-0000-0000-000000000001','video1','00000000-0000-0000-0000-000000000011','Título','Legenda','test',repeat('a',64));
INSERT INTO instagram_carousel_sources SELECT video_id,article_id FROM instagram_single_posts;
DO $$
DECLARE target uuid := '00000000-0000-0000-0000-000000000001';
        slot timestamptz; issued text := floor(extract(epoch FROM clock_timestamp()))::bigint::text;
        sig text;
BEGIN
  IF EXISTS (SELECT FROM stage_instagram_single('video1','00000000-0000-0000-0000-000000000011','Título','Legenda','test',repeat('a',64)))
  THEN RAISE EXCEPTION 'second active draft'; END IF;
  IF has_table_privilege('anon','instagram_single_posts','SELECT') OR
     has_function_privilege('authenticated','claim_instagram_single_due()','EXECUTE')
  THEN RAISE EXCEPTION 'exposure'; END IF;
  IF public.dispatch_instagram_single_tick() IS NOT NULL THEN RAISE EXCEPTION 'armed initially'; END IF;
  UPDATE instagram_single_settings SET automation_enabled=true;
  IF EXISTS (SELECT FROM claim_instagram_single_due()) OR reserve_instagram_single(target,repeat('a',64),true) IS NOT NULL
  THEN RAISE EXCEPTION 'pilot unexpectedly approved'; END IF;
  IF reserve_instagram_single(target,repeat('b',64)) IS NOT NULL THEN RAISE EXCEPTION 'wrong fingerprint'; END IF;
  slot := reserve_instagram_single(target,repeat('a',64));
  IF slot IS NULL OR slot <= now() OR (slot AT TIME ZONE 'America/Sao_Paulo')::time NOT IN ('06:15','11:45','17:45')
  THEN RAISE EXCEPTION 'bad slot'; END IF;
  IF EXISTS (SELECT FROM claim_instagram_single_due()) THEN RAISE EXCEPTION 'claimed too early'; END IF;
  UPDATE instagram_single_posts SET due_at=now() WHERE id=target;
  UPDATE podcast_distribution_settings SET instagram_enabled=true;
  IF EXISTS (SELECT FROM claim_instagram_single_due()) THEN RAISE EXCEPTION 'legacy writer is on'; END IF;
  UPDATE podcast_distribution_settings SET instagram_enabled=false;
  IF 1<>(SELECT count(*) FROM claim_instagram_single_due()) THEN RAISE EXCEPTION 'claim missing'; END IF;
  IF EXISTS (SELECT FROM claim_instagram_single_due()) THEN RAISE EXCEPTION 'repeat claim'; END IF;
  UPDATE instagram_single_posts SET lease_until=now()-interval '1 second', attempted_at=now(),state='publishing' WHERE id=target;
  IF EXISTS (SELECT FROM claim_instagram_single_due()) THEN RAISE EXCEPTION 'uncertain send replay'; END IF;
  IF NOT EXISTS (SELECT FROM instagram_single_posts WHERE id=target AND state='attention') THEN RAISE EXCEPTION 'missing reconciliation'; END IF;
  SELECT encode(extensions.hmac(convert_to(issued||':podcast-tick','UTF8'),signing_key,'sha256'),'hex') INTO sig FROM podcast_worker_credentials;
  IF authorize_instagram_single_tick(sig,issued) THEN RAISE EXCEPTION 'wrong purpose'; END IF;
  SELECT encode(extensions.hmac(convert_to(issued||':instagram-single-tick','UTF8'),signing_key,'sha256'),'hex') INTO sig FROM podcast_worker_credentials;
  IF NOT authorize_instagram_single_tick(sig,issued) THEN RAISE EXCEPTION 'valid signature rejected'; END IF;
END $$;
SQL
"${db[@]}" -1 -f docs/sql/instagram-release/20261114092000_instagram_three_slots.sql
"${db[@]}" <<'SQL'
UPDATE instagram_single_posts SET state='scheduled',due_at=now()+interval '1 minute',attempted_at=NULL;
INSERT INTO instagram_carousel_sources VALUES
 ('video2','00000000-0000-0000-0000-000000000012'),
 ('video3','00000000-0000-0000-0000-000000000013'),
 ('video4','00000000-0000-0000-0000-000000000014');
DO $$
DECLARE item record; second_slot timestamptz; third_slot timestamptz;
BEGIN
 SELECT * INTO item FROM stage_instagram_single('video2','00000000-0000-0000-0000-000000000012','Dois','Legenda','test',repeat('b',64));
 second_slot:=reserve_instagram_single(item.id,item.fingerprint,true);
 SELECT * INTO item FROM stage_instagram_single('video3','00000000-0000-0000-0000-000000000013','Três','Legenda','test',repeat('c',64));
 third_slot:=reserve_instagram_single(item.id,item.fingerprint,true);
 IF second_slot IS NULL OR third_slot IS NULL OR third_slot<=second_slot OR 3<>(SELECT count(*) FROM instagram_single_posts WHERE state='scheduled') THEN
  RAISE EXCEPTION 'three reservations did not occupy unique ascending slots';
 END IF;
 IF EXISTS (SELECT FROM stage_instagram_single('video4','00000000-0000-0000-0000-000000000014','Quatro','Legenda','test',repeat('d',64)))
 THEN RAISE EXCEPTION 'fourth post accepted'; END IF;
END $$;
SQL
