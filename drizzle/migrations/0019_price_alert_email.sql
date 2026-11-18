-- Proposed release SQL. Apply only after backup, isolated rehearsal and explicit production approval.
CREATE TABLE public.price_alert_email_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton), enabled boolean NOT NULL DEFAULT false
);
CREATE TABLE public.price_alert_emails (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), alert_id uuid NOT NULL REFERENCES public.bike_price_alerts(id),
 request_id uuid NOT NULL, kind text NOT NULL CHECK(kind IN ('registered','price_reached')),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','accepted','delivered','failed','uncertain','cancelled','bounced','complained')),
 delivery_from text, delivery_to text NOT NULL, reply_to text, payload jsonb, send_body text,
 attempts integer NOT NULL DEFAULT 0, available_at timestamptz NOT NULL DEFAULT now(),
 lease_token uuid, claimed_at timestamptz, provider_id text UNIQUE, failure_code text,
 created_at timestamptz NOT NULL DEFAULT now(), last_price_check_at timestamptz, accepted_at timestamptz, delivered_at timestamptz,
 UNIQUE(request_id,kind)
);
CREATE TABLE public.price_alert_email_events (
 event_id text PRIMARY KEY, provider_id text NOT NULL, event_type text NOT NULL,
 occurred_at timestamptz NOT NULL, sender text NOT NULL
);
ALTER TABLE public.price_alert_email_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.price_alert_email_events FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.price_alert_email_events TO service_role;
CREATE INDEX price_alert_email_events_provider ON public.price_alert_email_events(provider_id);
CREATE INDEX price_alert_emails_due ON public.price_alert_emails(available_at) WHERE status='pending';
ALTER TABLE public.price_alert_email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_alert_emails ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.price_alert_email_settings,public.price_alert_emails FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.price_alert_email_settings,public.price_alert_emails TO service_role;

CREATE FUNCTION public.enqueue_price_alert_email() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE a bike_price_alerts;
BEGIN
 IF new.payload->>'operation'<>'upsert' OR NOT EXISTS(SELECT 1 FROM price_alert_email_settings WHERE enabled) THEN RETURN new; END IF;
 SELECT * INTO a FROM bike_price_alerts WHERE id=new.alert_id AND consent AND status='active';
 IF a.id IS NULL OR a.email IS NULL THEN RETURN new; END IF;
 -- Trigger sees only new explicit submissions. Never backfill historical recipients.
 INSERT INTO price_alert_emails(alert_id,request_id,kind,delivery_to)
 VALUES(a.id,(new.payload->>'request_id')::uuid,'registered',a.email) ON CONFLICT DO NOTHING;
 RETURN new;
END $$;
CREATE TRIGGER price_alert_email_enqueue AFTER INSERT ON public.price_alert_hotpipe_outbox
 FOR EACH ROW EXECUTE FUNCTION public.enqueue_price_alert_email();

CREATE FUNCTION public.claim_price_alert_emails() RETURNS SETOF public.price_alert_emails LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 -- At most 10 distinct new subscriptions per tick; no legacy sweep.
 FOR r IN SELECT e.*,a.bike_id,a.person_name,a.reference_price,a.target_price,a.condition,a.created_at AS signup_at
 FROM price_alert_emails e JOIN bike_price_alerts a ON a.id=e.alert_id
 WHERE e.kind='registered' AND e.status NOT IN ('cancelled','bounced','complained')
 AND EXISTS(SELECT 1 FROM price_alert_hotpipe_requests h WHERE h.alert_id=a.id AND h.request_id=e.request_id)
 AND a.status='active' AND a.consent AND a.email=e.delivery_to
 AND NOT EXISTS(SELECT 1 FROM price_alert_emails blocked WHERE blocked.delivery_to=e.delivery_to AND blocked.status IN ('bounced','complained'))
 AND NOT EXISTS(SELECT 1 FROM price_alert_emails n WHERE n.request_id=e.request_id AND n.kind='price_reached')
 ORDER BY e.last_price_check_at NULLS FIRST,e.created_at LIMIT 10
 LOOP
  UPDATE price_alert_emails SET last_price_check_at=now() WHERE id=r.id;
  bike:=get_bike_price_history(r.bike_id,7);
  IF (bike->>'hasCurrentOffer')::boolean IS TRUE AND (bike->>'currentPrice')::numeric>0
    AND (bike->>'currentPrice')::numeric<r.reference_price
    AND (r.condition='any_drop' OR (bike->>'currentPrice')::numeric<=r.target_price) THEN
   INSERT INTO price_alert_emails(alert_id,request_id,kind,delivery_to) VALUES(r.alert_id,r.request_id,'price_reached',r.delivery_to) ON CONFLICT DO NOTHING;
  END IF;
 END LOOP;
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
   snapshot:=jsonb_build_object('name',r.person_name,'bikeId',r.bike_id,'bikeName',bike->>'name',
     'referencePrice',r.reference_price,'targetPrice',CASE WHEN r.condition='target' THEN r.target_price END,
     'currentPrice',(bike->>'currentPrice')::numeric,'image',bike->>'image','link',bike->>'link',
     'observedAt',COALESCE(bike->>'lastObservedAt',now()::text));
   UPDATE price_alert_emails SET payload=snapshot,delivery_from=sender.from_email,reply_to=sender.reply_to WHERE id=r.id;
  END IF;
  RETURN QUERY UPDATE price_alert_emails SET status='processing',lease_token=gen_random_uuid(),claimed_at=now(),attempts=attempts+1 WHERE id=r.id RETURNING *;
 END LOOP;
END $$;

CREATE FUNCTION public.prepare_price_alert_email(p_id uuid,p_lease uuid,p_body text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
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
 UPDATE price_alert_emails e SET send_body=COALESCE(send_body,p_body)
 WHERE e.id=p_id AND e.lease_token=p_lease AND e.status='processing' AND e.claimed_at>now()-interval '4 minutes'
 AND EXISTS(SELECT 1 FROM bike_price_alerts a JOIN price_alert_hotpipe_requests h ON h.alert_id=a.id
 WHERE a.id=e.alert_id AND h.request_id=e.request_id AND a.consent AND a.status='active' AND a.email=e.delivery_to)
 RETURNING send_body INTO v;
 RETURN v;
END $$;
CREATE FUNCTION public.apply_price_alert_email_receipt(p_id uuid) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path=public AS $$
 UPDATE price_alert_emails e SET status=CASE WHEN summary.severity=4 THEN 'complained' WHEN summary.severity=3 THEN 'bounced'
 WHEN summary.severity=2 THEN 'failed' ELSE 'delivered' END,delivered_at=COALESCE(e.delivered_at,summary.delivered)
 FROM (SELECT m.id,max(CASE v.event_type WHEN 'email.complained' THEN 4 WHEN 'email.bounced' THEN 3 WHEN 'email.failed' THEN 2 ELSE 1 END) severity,
 min(v.occurred_at) FILTER(WHERE v.event_type='email.delivered') delivered
 FROM price_alert_emails m JOIN price_alert_email_events v ON v.provider_id=m.provider_id AND lower(v.sender)=lower(m.delivery_from)
 WHERE m.id=p_id GROUP BY m.id) summary WHERE e.id=summary.id;
$$;
CREATE FUNCTION public.finish_price_alert_email(p_id uuid,p_lease uuid,p_status text,p_provider text,p_error text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE saved boolean;
BEGIN
 IF p_status NOT IN ('pending','accepted','failed','uncertain') OR (p_status='accepted') IS DISTINCT FROM (p_provider IS NOT NULL) THEN RAISE EXCEPTION 'invalid_result'; END IF;
 UPDATE price_alert_emails SET status=CASE WHEN p_status='pending' AND attempts>=5 THEN 'failed' ELSE p_status END,
  provider_id=p_provider,failure_code=p_error,accepted_at=CASE WHEN p_status='accepted' THEN now() END,
 available_at=now()+interval '2 minutes',lease_token=NULL
 WHERE id=p_id AND lease_token=p_lease AND status='processing';
 saved:=FOUND;
 IF saved AND p_provider IS NOT NULL THEN PERFORM apply_price_alert_email_receipt(p_id); END IF;
 RETURN saved;
END $$;
CREATE FUNCTION public.record_price_alert_email_event(p_event text,p_provider text,p_type text,p_occurred timestamptz,p_from text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE found_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM newsletter_settings WHERE lower(from_email)=lower(p_from)) AND NOT EXISTS(SELECT 1 FROM price_alert_emails WHERE lower(delivery_from)=lower(p_from)) THEN RETURN false; END IF;
 IF p_type NOT IN ('email.delivered','email.bounced','email.complained','email.failed') OR p_event IS NULL OR p_provider IS NULL THEN RETURN false; END IF;
 INSERT INTO price_alert_email_events(event_id,provider_id,event_type,occurred_at,sender) VALUES(p_event,p_provider,p_type,p_occurred,p_from) ON CONFLICT DO NOTHING;
 SELECT id INTO found_id FROM price_alert_emails WHERE provider_id=p_provider AND lower(delivery_from)=lower(p_from);
 IF found_id IS NOT NULL THEN PERFORM apply_price_alert_email_receipt(found_id); END IF;
 RETURN true;
END $$;
-- No client can claim/send/inspect messages, even with an authenticated account.
REVOKE ALL ON FUNCTION public.apply_price_alert_email_receipt(uuid),public.enqueue_price_alert_email(),public.claim_price_alert_emails(),public.prepare_price_alert_email(uuid,uuid,text),public.finish_price_alert_email(uuid,uuid,text,text,text),public.record_price_alert_email_event(text,text,text,timestamptz,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.claim_price_alert_emails(),public.prepare_price_alert_email(uuid,uuid,text),public.finish_price_alert_email(uuid,uuid,text,text,text),public.record_price_alert_email_event(text,text,text,timestamptz,text) TO service_role;
