-- Authorized audience, but requires the approved renderer + migration first.
-- No real address/name is embedded in this script. Recheck the offer before running.
WITH bike AS MATERIALIZED (
 SELECT public.get_bike_price_history('v9_max',7) AS data
), eligible AS (
 SELECT a.id AS alert_id,h.request_id,a.email,
  jsonb_build_object('currentPrice',(b.data->>'currentPrice')::numeric,'link',b.data->>'link') AS payload
 FROM public.bike_price_alerts a
 JOIN public.price_alert_hotpipe_requests h ON h.alert_id=a.id CROSS JOIN bike b
 WHERE a.bike_id='v9_max' AND a.status='active' AND a.consent
  AND EXISTS(SELECT 1 FROM public.price_alert_email_settings WHERE enabled)
  AND a.email~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  AND (b.data->>'hasCurrentOffer')::boolean AND (b.data->>'currentPrice')::numeric=6174
  AND b.data->>'link'='https://meli.la/24CEhyq'
  AND NOT EXISTS(SELECT 1 FROM public.price_alert_emails e WHERE e.request_id=h.request_id AND e.kind IN ('price_reached','price_update'))
  AND NOT EXISTS(SELECT 1 FROM public.price_alert_emails e WHERE lower(e.delivery_to)=lower(a.email) AND e.status IN ('bounced','complained','uncertain'))
), inserted AS (
 INSERT INTO public.price_alert_emails(alert_id,request_id,kind,delivery_to,payload)
 SELECT alert_id,request_id,'price_update',email,payload FROM eligible
 WHERE (SELECT count(*) FROM eligible)=10
  AND (SELECT count(DISTINCT lower(email)) FROM eligible)=10
 ON CONFLICT(request_id,kind) DO NOTHING RETURNING id
)
SELECT count(*) AS queued_emails FROM inserted;
