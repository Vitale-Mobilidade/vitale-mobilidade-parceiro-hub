-- Proposed migration. Promote through the official migration tool only after approval.
-- Deploy the backwards-compatible price_update renderer before applying/queuing.
BEGIN;
ALTER TABLE public.price_alert_emails DROP CONSTRAINT price_alert_emails_kind_check;
ALTER TABLE public.price_alert_emails ADD CONSTRAINT price_alert_emails_kind_check CHECK(kind IN ('registered','price_reached','price_update'));
CREATE OR REPLACE FUNCTION public.claim_price_alert_emails() RETURNS SETOF public.price_alert_emails LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE r record; bike jsonb; sender record; snapshot jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM price_alert_email_settings WHERE enabled) THEN RETURN; END IF;
 UPDATE price_alert_emails SET status='uncertain',failure_code='email_worker_interrupted' WHERE status='processing' AND claimed_at<now()-interval '5 minutes';
 -- A changed/cancelled logical request must not keep sending emails.
 UPDATE price_alert_emails e SET status='cancelled',failure_code='request_changed'
 WHERE e.status='pending' AND (EXISTS(SELECT 1 FROM price_alert_emails blocked WHERE blocked.delivery_to=e.delivery_to AND blocked.status IN ('bounced','complained')) OR NOT EXISTS(SELECT 1 FROM bike_price_alerts a JOIN price_alert_hotpipe_requests h ON h.alert_id=a.id
   WHERE a.id=e.alert_id AND h.request_id=e.request_id AND a.status='active' AND a.consent AND a.email=e.delivery_to));
 SELECT from_email,reply_to INTO sender FROM newsletter_settings WHERE singleton;
 IF sender.from_email IS NULL OR sender.reply_to IS NULL THEN RETURN; END IF;
 -- Monitor every current consented subscription, including legacy requests.
 -- Resolve the canonical offer once per Bike, without manufacturing registration emails.
 WITH subscriptions AS MATERIALIZED (
  SELECT a.id AS alert_id,h.request_id,a.email,a.bike_id,a.reference_price,a.target_price,a.condition
  FROM bike_price_alerts a JOIN price_alert_hotpipe_requests h ON h.alert_id=a.id
  WHERE a.status='active' AND a.consent AND a.email~'^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
   AND NOT EXISTS(SELECT 1 FROM price_alert_emails blocked WHERE lower(blocked.delivery_to)=lower(a.email) AND blocked.status IN ('bounced','complained'))
   AND NOT EXISTS(SELECT 1 FROM price_alert_emails n WHERE n.request_id=h.request_id AND n.kind='price_reached')
 ), offers AS MATERIALIZED (
  SELECT bike_id,get_bike_price_history(bike_id,7) AS data FROM (SELECT DISTINCT bike_id FROM subscriptions) bikes
 )
 INSERT INTO price_alert_emails(alert_id,request_id,kind,delivery_to)
 SELECT s.alert_id,s.request_id,'price_reached',s.email FROM subscriptions s JOIN offers b USING(bike_id)
 WHERE (b.data->>'hasCurrentOffer')::boolean IS TRUE AND (b.data->>'currentPrice')::numeric>0
  AND (b.data->>'currentPrice')::numeric<s.reference_price
  AND (s.condition='any_drop' OR (b.data->>'currentPrice')::numeric<=s.target_price)
 ON CONFLICT(request_id,kind) DO NOTHING;
 FOR r IN SELECT e.*,a.bike_id,a.person_name,a.reference_price,a.target_price,a.condition
 FROM price_alert_emails e JOIN bike_price_alerts a ON a.id=e.alert_id
 WHERE e.status='pending' AND e.available_at<=now() AND e.attempts<5
 ORDER BY e.available_at,e.id FOR UPDATE OF e SKIP LOCKED LIMIT 2
 LOOP
  IF r.send_body IS NULL THEN
   bike:=get_bike_price_history(r.bike_id,7);
   IF (bike->>'hasCurrentOffer')::boolean IS NOT TRUE OR COALESCE((bike->>'currentPrice')::numeric,0)<=0
    OR bike->>'link' !~ '^https://meli\.la/[A-Za-z0-9_-]+$' THEN
    UPDATE price_alert_emails SET available_at=now()+interval '10 minutes',failure_code='offer_unavailable' WHERE id=r.id; CONTINUE;
   END IF;
   IF r.kind='price_reached' AND NOT ((bike->>'currentPrice')::numeric<r.reference_price AND (r.condition='any_drop' OR (bike->>'currentPrice')::numeric<=r.target_price)) THEN
    UPDATE price_alert_emails SET available_at=now()+interval '10 minutes',failure_code='price_no_longer_reached' WHERE id=r.id; CONTINUE;
   END IF;
   IF r.kind='price_update' AND (r.payload IS NULL
    OR (bike->>'currentPrice')::numeric IS DISTINCT FROM (r.payload->>'currentPrice')::numeric
    OR bike->>'link' IS DISTINCT FROM r.payload->>'link') THEN
    UPDATE price_alert_emails SET status='cancelled',failure_code='manual_offer_changed' WHERE id=r.id; CONTINUE;
   END IF;
   snapshot:=jsonb_build_object('name',r.person_name,'bikeId',r.bike_id,'bikeName',bike->>'name',
     'referencePrice',r.reference_price,'targetPrice',CASE WHEN r.condition='target' THEN r.target_price END,
     'currentPrice',(bike->>'currentPrice')::numeric,'image',bike->>'image','link',bike->>'link',
     'observedAt',COALESCE(bike->>'lastObservedAt',now()::text));
   UPDATE price_alert_emails SET payload=snapshot,delivery_from=sender.from_email,reply_to=sender.reply_to WHERE id=r.id;
  END IF;
  RETURN QUERY UPDATE price_alert_emails SET status='processing',lease_token=gen_random_uuid(),claimed_at=now(),attempts=attempts+1 WHERE id=r.id RETURNING *;
 END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prepare_price_alert_email(p_id uuid,p_lease uuid,p_body text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v text; queue_row price_alert_emails; alert_row bike_price_alerts; bike jsonb;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM price_alert_email_settings WHERE enabled) THEN RETURN NULL; END IF;
 SELECT * INTO queue_row FROM price_alert_emails WHERE id=p_id AND lease_token=p_lease AND status='processing' FOR UPDATE;
 IF queue_row.id IS NULL THEN RETURN NULL; END IF;
 IF queue_row.kind='price_reached' THEN
  SELECT * INTO alert_row FROM bike_price_alerts WHERE id=queue_row.alert_id;
  bike:=get_bike_price_history(alert_row.bike_id,7);
  IF (bike->>'hasCurrentOffer')::boolean IS NOT TRUE OR COALESCE((bike->>'currentPrice')::numeric,0)<=0
   OR NOT ((bike->>'currentPrice')::numeric<alert_row.reference_price AND (alert_row.condition='any_drop' OR (bike->>'currentPrice')::numeric<=alert_row.target_price)) THEN RETURN NULL; END IF;
 END IF;
 IF queue_row.kind='price_update' THEN
  SELECT * INTO alert_row FROM bike_price_alerts WHERE id=queue_row.alert_id;
  bike:=get_bike_price_history(alert_row.bike_id,7);
  IF (bike->>'hasCurrentOffer')::boolean IS NOT TRUE
   OR (bike->>'currentPrice')::numeric IS DISTINCT FROM (queue_row.payload->>'currentPrice')::numeric
   OR bike->>'link' IS DISTINCT FROM queue_row.payload->>'link' THEN RETURN NULL; END IF;
 END IF;
 UPDATE price_alert_emails e SET send_body=COALESCE(send_body,p_body)
 WHERE e.id=p_id AND e.lease_token=p_lease AND e.status='processing' AND e.claimed_at>now()-interval '4 minutes'
 AND EXISTS(SELECT 1 FROM bike_price_alerts a JOIN price_alert_hotpipe_requests h ON h.alert_id=a.id
 WHERE a.id=e.alert_id AND h.request_id=e.request_id AND a.consent AND a.status='active' AND a.email=e.delivery_to)
 AND NOT EXISTS(SELECT 1 FROM price_alert_emails blocked WHERE lower(blocked.delivery_to)=lower(e.delivery_to) AND blocked.status IN ('bounced','complained'))
 RETURNING send_body INTO v;
 RETURN v;
END $$;
CREATE OR REPLACE FUNCTION public.authorize_price_alert_hotpipe(signature text, issued_at text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare settings public.price_alert_hotpipe_settings;
begin
 if signature is null or issued_at is null or signature !~ '^[a-f0-9]{64}$' or issued_at !~ '^[0-9]{10}$' then return false; end if;
 if abs(extract(epoch from now())-issued_at::bigint)>300 then return false; end if;
 select * into settings from price_alert_hotpipe_settings where singleton;
 return (settings.enabled or exists(select 1 from price_alert_email_settings where enabled)) and encode(extensions.hmac(convert_to(issued_at||':price-alert-hotpipe','UTF8'),settings.signing_key,'sha256'),'hex')=signature;
end $function$;

CREATE OR REPLACE FUNCTION public.claim_price_alert_hotpipe()
 RETURNS SETOF price_alert_hotpipe_outbox
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
 with exhausted as (
 update price_alert_hotpipe_outbox set status='failed',lease_token=null,lease_until=null where status='processing' and lease_until<now() and attempts>=10 returning sequence
 ), candidates as (
 select o.sequence from price_alert_hotpipe_outbox o
 where exists(select 1 from price_alert_hotpipe_settings where enabled) and ((o.status='pending' and o.next_attempt_at<=now()) or (o.status='processing' and o.lease_until<now()))
 and o.attempts<10 and not exists(select 1 from price_alert_hotpipe_outbox earlier where earlier.alert_id=o.alert_id and earlier.sequence<o.sequence and earlier.status<>'delivered')
 order by o.sequence limit 10 for update skip locked
 ) update price_alert_hotpipe_outbox o set status='processing',attempts=attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '3 minutes'
 from candidates c where o.sequence=c.sequence returning o.*;
$function$;

CREATE OR REPLACE FUNCTION public.dispatch_price_alert_hotpipe()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
declare settings public.price_alert_hotpipe_settings; issued text; signature text;
begin
 select * into settings from price_alert_hotpipe_settings where singleton;
 if not settings.enabled and not exists(select 1 from price_alert_email_settings where enabled) then return null; end if;
 issued:=floor(extract(epoch from clock_timestamp()))::bigint::text;
 signature:=encode(extensions.hmac(convert_to(issued||':price-alert-hotpipe','UTF8'),settings.signing_key,'sha256'),'hex');
 return net.http_post(url:='https://vitalemobilidade.com/api/public/price-alert-outbox',headers:=jsonb_build_object('Content-Type','application/json','x-worker-signature',signature,'x-worker-issued-at',issued),body:='{}'::jsonb,timeout_milliseconds:=150000);
end $function$;
COMMIT;
