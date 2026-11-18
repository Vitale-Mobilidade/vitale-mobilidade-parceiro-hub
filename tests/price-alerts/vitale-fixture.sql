CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE bike_price_alerts(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),bike_id text,bike_name text,person_name text,phone_e164 text,email text,condition text,target_price numeric,reference_price numeric,status text DEFAULT 'active',consent boolean DEFAULT true,created_at timestamptz DEFAULT now());
CREATE TABLE price_alert_hotpipe_requests(alert_id uuid PRIMARY KEY,request_id uuid);
CREATE TABLE price_alert_hotpipe_outbox(sequence bigserial,event_id uuid DEFAULT gen_random_uuid(),alert_id uuid,payload jsonb,status text DEFAULT 'pending',created_at timestamptz DEFAULT now());
CREATE TABLE newsletter_settings(singleton boolean DEFAULT true,from_email text,reply_to text);
INSERT INTO newsletter_settings VALUES(true,'vitale@example.test','lucas@example.test');
CREATE TABLE fixture_bikes(id text PRIMARY KEY,data jsonb);
INSERT INTO fixture_bikes VALUES('v9_max','{"name":"V9 Max","hasCurrentOffer":true,"currentPrice":6250,"image":"https://cdn.example.test/bike.jpg","link":"https://meli.la/FixtureOnly","lastObservedAt":"2026-11-18T12:00:00Z"}');
CREATE FUNCTION get_bike_price_history(p_bike_id text,p_days integer) RETURNS jsonb LANGUAGE sql AS $$ SELECT data FROM fixture_bikes WHERE id=p_bike_id $$;
