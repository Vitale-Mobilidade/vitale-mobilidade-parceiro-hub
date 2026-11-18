BEGIN;
CREATE FUNCTION public.price_alert_metrics() RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
WITH days AS (SELECT (d::date) AS calendar_date FROM generate_series((now() AT TIME ZONE 'America/Sao_Paulo')::date-29,(now() AT TIME ZONE 'America/Sao_Paulo')::date,interval '1 day') d),
 daily AS (SELECT d.calendar_date,count(a.id)::int registrations FROM days d LEFT JOIN bike_price_alerts a ON (a.created_at AT TIME ZONE 'America/Sao_Paulo')::date=d.calendar_date GROUP BY d.calendar_date),
 errors AS (SELECT count(*) FILTER(WHERE status='failed') failed,count(*) FILTER(WHERE status IN ('pending','processing')) pending,min(created_at) FILTER(WHERE status IN ('pending','processing')) oldest FROM price_alert_hotpipe_outbox),
 email AS (SELECT status,count(*)::int n FROM price_alert_emails GROUP BY status)
SELECT jsonb_build_object('totalAlerts',count(*),'people',count(DISTINCT phone_e164),
 'activeRegistrations',count(*) FILTER(WHERE status='active' AND consent),
 'recent7d',count(*) FILTER(WHERE created_at>=((now() AT TIME ZONE 'America/Sao_Paulo')::date-6)::timestamp AT TIME ZONE 'America/Sao_Paulo'),
 'daily',(SELECT jsonb_agg(jsonb_build_object('day',calendar_date,'registrations',registrations) ORDER BY calendar_date) FROM daily),
 'export',(SELECT jsonb_build_object('failed',failed,'pending',pending,'oldestPending',oldest) FROM errors),
 'email',COALESCE((SELECT jsonb_object_agg(status,n) FROM email),'{}'::jsonb)) FROM bike_price_alerts;
$$;
REVOKE ALL ON FUNCTION public.price_alert_metrics() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.price_alert_metrics() TO service_role;
COMMIT;
