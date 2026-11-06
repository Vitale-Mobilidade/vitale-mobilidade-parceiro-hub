\set ON_ERROR_STOP on
CREATE OR REPLACE FUNCTION pg_temp.check_true(v boolean,label text) RETURNS void LANGUAGE plpgsql AS $$BEGIN IF v IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAILED: %',label; END IF; END $$;
CREATE OR REPLACE FUNCTION pg_temp.expect_error(statement text,fragment text) RETURNS void LANGUAGE plpgsql AS $$DECLARE failed boolean:=false;BEGIN BEGIN EXECUTE statement;EXCEPTION WHEN OTHERS THEN IF position(fragment IN SQLERRM)=0 THEN RAISE EXCEPTION 'Unexpected: % expected %',SQLERRM,fragment;END IF;failed:=true;END;IF NOT failed THEN RAISE EXCEPTION 'Expected rejection: %',fragment;END IF;END $$;
RESET ROLE;
UPDATE public.editorial_admin_memberships SET active=true WHERE user_id='00000000-0000-4000-8000-000000000001';
-- New configuration starts inert: all prior totals remain identical.
SELECT pg_temp.check_true((public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)-'trackingSince'-'excludedOrders')=(public.admin_member_metrics_before_reporting_start('00000000-0000-4000-8000-000000000001',7)),'inactive baseline preserves previous metric contract');
SET ROLE anon;
SELECT pg_temp.expect_error('SELECT * FROM public.member_reporting_settings','permission denied');
SELECT pg_temp.expect_error($s$SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)$s$,'permission denied');
RESET ROLE;
SET ROLE authenticated;
SELECT pg_temp.expect_error('UPDATE public.member_reporting_settings SET tracking_since=current_date','permission denied');
SELECT pg_temp.expect_error($s$SELECT public.admin_member_metrics_before_reporting_start('00000000-0000-4000-8000-000000000001',7)$s$,'permission denied');
RESET ROLE;
SELECT pg_temp.expect_error($s$SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000091',7)$s$,'forbidden');
SELECT pg_temp.expect_error($s$SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000001',91)$s$,'invalid_input');
-- Synthetic timeline: a registration before and at the exact São Paulo midnight.
UPDATE public.member_profiles SET community_joined_at=now()-interval '2 days' WHERE community_joined_at IS NOT NULL;
UPDATE public.member_profiles SET community_joined_at=((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'UTC')+interval '2 hours 59 minutes' WHERE user_id='00000000-0000-4000-8000-000000000090';
UPDATE public.member_profiles SET community_joined_at=((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'UTC')+interval '3 hours' WHERE user_id='00000000-0000-4000-8000-000000000091';
UPDATE public.member_bike_listings SET created_at=now()-interval '2 days';
SELECT id::text AS today_listing FROM public.member_bike_listings ORDER BY id LIMIT 1 \gset
UPDATE public.member_bike_listings SET created_at=((now() AT TIME ZONE 'America/Sao_Paulo')::date::timestamp AT TIME ZONE 'UTC')+interval '3 hours' WHERE id=:'today_listing';
SELECT id::text AS test_order FROM public.member_listing_billing ORDER BY id LIMIT 1 \gset
-- Keep the test purchase on today's date to prove exclusion by ID, not only date.
UPDATE public.member_listing_billing SET paid_at=now() WHERE id=:'test_order';
CREATE TEMP TABLE reporting_snapshot AS SELECT (SELECT count(*) FROM public.member_profiles) profiles,(SELECT count(*) FROM public.member_bike_listings) listings,md5((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id)::text FROM public.member_listing_billing b)) billing;
UPDATE public.member_reporting_settings SET tracking_since=(now() AT TIME ZONE 'America/Sao_Paulo')::date,excluded_order_ids=ARRAY[:'test_order'::uuid],note='Teste sintético';
SELECT public.admin_member_metrics('00000000-0000-4000-8000-000000000001',30) AS report \gset
SELECT pg_temp.check_true((:'report'::jsonb->>'members')::int=1,'only registration at/after São Paulo midnight');
SELECT pg_temp.check_true((:'report'::jsonb->>'listings')::int=1,'only today listing count');
SELECT pg_temp.check_true((:'report'::jsonb->>'grossCents')::int=0 AND (:'report'::jsonb->>'reversedPayments')::int=0,'excluded test omitted from revenue and reversals');
SELECT pg_temp.check_true(jsonb_array_length(:'report'::jsonb->'daily')=1 AND (:'report'::jsonb->'daily'->0->>'payments')::int=0,'no fabricated zero history before baseline');
SELECT pg_temp.check_true((:'report'::jsonb->>'excludedOrders')::int=1 AND (:'report'::jsonb->>'trackingSince')::date=(now() AT TIME ZONE 'America/Sao_Paulo')::date,'baseline metadata explicit');
SELECT pg_temp.check_true((SELECT profiles=(SELECT count(*) FROM public.member_profiles) AND listings=(SELECT count(*) FROM public.member_bike_listings) AND billing=md5((SELECT jsonb_agg(to_jsonb(b) ORDER BY b.id)::text FROM public.member_listing_billing b)) FROM reporting_snapshot),'analytics reset never mutates business records or deadlines');
-- An excluded order remains excluded even if a provider later refreshes its paid date.
UPDATE public.member_listing_billing SET paid_at=now()+interval '1 hour' WHERE id=:'test_order';
SELECT pg_temp.check_true((public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)->>'grossCents')::int=0,'test exclusion survives financial refresh');
UPDATE public.member_reporting_settings SET excluded_order_ids='{}';
SELECT pg_temp.check_true((public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)->>'grossCents')::int=15000,'unexcluded real payment in window counts once');
UPDATE public.member_reporting_settings SET tracking_since=(now() AT TIME ZONE 'America/Sao_Paulo')::date-10;
SELECT pg_temp.check_true(jsonb_array_length(public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)->'daily')=7,'selected period remains bounded after baseline ages');
BEGIN;
-- Only presentation/apuração changes; never modify historical finance or identity rows.
UPDATE public.member_reporting_settings SET tracking_since=NULL,excluded_order_ids='{}',note='Marco desativado por rollback',updated_at=now() WHERE singleton;
NOTIFY pgrst,'reload schema';
COMMIT;

SELECT pg_temp.check_true((public.admin_member_metrics('00000000-0000-4000-8000-000000000001',7)-'trackingSince'-'excludedOrders')=public.admin_member_metrics_before_reporting_start('00000000-0000-4000-8000-000000000001',7),'rollback restores prior counting without data deletion');
