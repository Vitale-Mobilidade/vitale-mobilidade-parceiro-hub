BEGIN;
CREATE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$ BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL %',label; END IF; END $$;
SELECT pg_temp.check_true(NOT has_function_privilege('anon','public.member_listing_has_content(public.member_bike_listings)','EXECUTE') AND NOT has_function_privilege('authenticated','public.member_listing_has_content(public.member_bike_listings)','EXECUTE') AND NOT has_function_privilege('service_role','public.member_listing_has_content(public.member_bike_listings)','EXECUTE'),'helper remains private');
-- Isolate a date for the exact production case without changing existing fixtures.
INSERT INTO public.member_bike_listings(id,user_id,seller_kind,created_at)
VALUES('93000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','channel','2001-02-03T15:00:00Z');
SELECT pg_temp.check_true((SELECT NOT public.member_listing_has_content(l) FROM public.member_bike_listings l WHERE id='93000000-0000-4000-8000-000000000001'),'default placeholder is hidden by both rules');
SELECT pg_temp.check_true(public.member_metrics_between('2001-02-03','2001-02-03')->>'listings'='0' AND public.member_metrics_between('2001-02-03','2001-02-03')->>'channelListings'='0','zero created when the channel dashboard is empty');
-- Non-default content, including zero mileage, makes a real draft visible and counted.
DO $$
DECLARE l public.member_bike_listings;r public.member_bike_listings;patch jsonb;
BEGIN
 SELECT * INTO l FROM public.member_bike_listings WHERE id='93000000-0000-4000-8000-000000000001';
 FOREACH patch IN ARRAY ARRAY[
 '{"title":"Uma bike"}'::jsonb,'{"brand":"Marca"}'::jsonb,'{"model":"Modelo"}'::jsonb,'{"description":"Descrição"}'::jsonb,'{"city":"São Paulo"}'::jsonb,'{"state":"SP"}'::jsonb,
 '{"price_cents":15000}'::jsonb,'{"mileage_km":0}'::jsonb,'{"model_year":2025}'::jsonb,'{"condition":"new"}'::jsonb,'{"battery":"replaced"}'::jsonb,'{"invoice":true}'::jsonb,'{"maintenance":"Revisada"}'::jsonb
 ] LOOP
  r:=jsonb_populate_record(l,patch);
  PERFORM pg_temp.check_true(public.member_listing_has_content(r),'content parity '||patch::text);
 END LOOP;
 r:=jsonb_populate_record(l,'{"title":" Minha bike ","brand":"  ","description":" "}'::jsonb);
 PERFORM pg_temp.check_true(NOT public.member_listing_has_content(r),'whitespace remains empty');
 r:=jsonb_populate_record(l,'{"status":"archived"}'::jsonb);
 PERFORM pg_temp.check_true(NOT public.member_listing_has_content(r),'status alone does not make a meaningful listing');
END $$;
UPDATE public.member_bike_listings SET brand='Marca' WHERE id='93000000-0000-4000-8000-000000000001';
SELECT pg_temp.check_true(public.member_metrics_between('2001-02-03','2001-02-03')->>'listings'='1' AND public.member_metrics_between('2001-02-03','2001-02-03')->>'channelListings'='1','meaningful draft counts exactly once');
UPDATE public.member_bike_listings SET brand='',status='archived' WHERE id='93000000-0000-4000-8000-000000000001';
SELECT pg_temp.check_true(public.member_metrics_between('2001-02-03','2001-02-03')->>'listings'='0','empty archived record stays excluded');
INSERT INTO public.member_media_assets(id,user_id,listing_id,kind,object_path,status) VALUES('93000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000001','listing','synthetic/empty-draft-photo.webp','reserved');
SELECT pg_temp.check_true(public.member_metrics_between('2001-02-03','2001-02-03')->>'listings'='1','reserved photo matches existing dashboard visibility');
UPDATE public.member_media_assets SET status='ready' WHERE id='93000000-0000-4000-8000-000000000002';
SELECT pg_temp.check_true(public.member_metrics_between('2001-02-03','2001-02-03')->>'listings'='1','ready photo counted once');
UPDATE public.member_media_assets SET status='removed' WHERE id='93000000-0000-4000-8000-000000000002';
SELECT pg_temp.check_true(public.member_metrics_between('2001-02-03','2001-02-03')->>'listings'='0','removed photo does not inflate count');
-- Actual dashboard current, previous and daily all share the corrected aggregate.
UPDATE public.member_reporting_settings SET tracking_since=NULL;
SELECT public.admin_member_period_metrics('00000000-0000-4000-8000-000000000001','today') AS report_before \gset
INSERT INTO public.member_bike_listings(id,user_id,seller_kind) VALUES('93000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-000000000001','channel');
SELECT public.admin_member_period_metrics('00000000-0000-4000-8000-000000000001','today') AS report_after \gset
SELECT pg_temp.check_true(:'report_before'::jsonb=:'report_after'::jsonb,'empty reservation changes no KPI or daily comparison');
SELECT pg_temp.check_true((SELECT count(*)=2 FROM public.member_bike_listings WHERE id IN ('93000000-0000-4000-8000-000000000001','93000000-0000-4000-8000-000000000003')),'drafts retained, not deleted');
ROLLBACK;
