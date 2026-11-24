CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE bike_price_alerts(id uuid PRIMARY KEY,bike_id text,person_name text,email text,reference_price numeric,target_price numeric,condition text,status text,consent boolean,created_at timestamptz DEFAULT now());
CREATE TABLE price_alert_hotpipe_requests(alert_id uuid,request_id uuid);
CREATE TABLE price_alert_hotpipe_outbox(sequence bigserial,alert_id uuid,payload jsonb,status text DEFAULT 'pending',attempts integer DEFAULT 0,next_attempt_at timestamptz DEFAULT now(),lease_until timestamptz,lease_token uuid);
CREATE SCHEMA extensions; CREATE EXTENSION pgcrypto WITH SCHEMA extensions;
CREATE SCHEMA net;
CREATE FUNCTION net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds integer) RETURNS bigint LANGUAGE sql AS $$SELECT 99::bigint$$;
CREATE TABLE price_alert_hotpipe_settings(singleton boolean,enabled boolean,signing_key bytea);
INSERT INTO price_alert_hotpipe_settings VALUES(true,false,decode(repeat('ab',32),'hex'));
CREATE FUNCTION authorize_price_alert_hotpipe(signature text,issued_at text) RETURNS boolean LANGUAGE sql AS $$SELECT false$$;
CREATE FUNCTION dispatch_price_alert_hotpipe() RETURNS bigint LANGUAGE sql AS $$SELECT null::bigint$$;
CREATE FUNCTION claim_price_alert_hotpipe() RETURNS SETOF price_alert_hotpipe_outbox LANGUAGE sql AS $$SELECT * FROM price_alert_hotpipe_outbox WHERE false$$;
REVOKE ALL ON FUNCTION authorize_price_alert_hotpipe(text,text),dispatch_price_alert_hotpipe(),claim_price_alert_hotpipe() FROM PUBLIC,anon,authenticated;
CREATE TABLE newsletter_settings(singleton boolean,from_email text,reply_to text);
INSERT INTO newsletter_settings VALUES(true,'vitale@example.test','reply@example.test');
CREATE TABLE fixture_offers(bike_id text PRIMARY KEY,price numeric,link text);
INSERT INTO fixture_offers VALUES('v9_max',6174,'https://meli.la/FixtureOnly');
CREATE FUNCTION get_bike_price_history(text,integer) RETURNS jsonb LANGUAGE sql AS $$SELECT jsonb_build_object('name','V9 Max','hasCurrentOffer',true,'currentPrice',price,'link',link,'lastObservedAt','2026-11-24T12:55:00Z','image',null) FROM fixture_offers WHERE bike_id=$1$$;
INSERT INTO bike_price_alerts
SELECT md5('alert-'||i)::uuid,'v9_max','Pessoa Fixture',
 CASE WHEN i=3 THEN null WHEN i=9 THEN 'invalid' ELSE 'person'||i||'@example.test' END,
 6500,CASE WHEN i=2 THEN 5900 ELSE null END,CASE WHEN i=2 THEN 'target' ELSE 'any_drop' END,
 CASE WHEN i=5 THEN 'cancelled' ELSE 'active' END,i<>4,now()-interval '30 days'
FROM generate_series(1,9) i;
INSERT INTO price_alert_hotpipe_requests SELECT id,md5('request-'||id)::uuid FROM bike_price_alerts;
