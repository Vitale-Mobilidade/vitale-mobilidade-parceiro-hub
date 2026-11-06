BEGIN;
CREATE TABLE public.member_operation_alert_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 recipient text CHECK(recipient IS NULL OR recipient ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 starts_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.member_operation_alert_settings(singleton) VALUES(true);
CREATE TABLE public.member_operation_alerts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 event_kind text NOT NULL CHECK(event_kind IN ('registration','paid_listing')),
 source_id uuid NOT NULL,
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 created_at timestamptz NOT NULL DEFAULT now(),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','sending','sent','needs_review')),
 UNIQUE(event_kind,source_id),
 attempts integer NOT NULL DEFAULT 0,
 available_at timestamptz NOT NULL DEFAULT now(),
 first_attempt_at timestamptz,
 lease_token uuid,
 lease_until timestamptz,
 delivery_from text,
 delivery_to text,
 delivery_body text,
 provider_id text,
 accepted_at timestamptz,
 error_code text
);
CREATE INDEX member_operation_alerts_pending ON public.member_operation_alerts(available_at,created_at) WHERE status IN ('pending','sending');
ALTER TABLE public.member_operation_alert_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_operation_alerts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_operation_alert_settings,public.member_operation_alerts FROM PUBLIC,anon,authenticated;
GRANT SELECT,UPDATE ON public.member_operation_alert_settings TO service_role;
GRANT SELECT ON public.member_operation_alerts TO service_role;

CREATE FUNCTION public.member_operation_alert_registration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.community_joined_at IS NOT NULL AND (TG_OP='INSERT' OR OLD.community_joined_at IS NULL)
 AND EXISTS(SELECT 1 FROM public.member_operation_alert_settings WHERE singleton AND enabled AND NEW.community_joined_at>=starts_at)
 AND EXISTS(SELECT 1 FROM auth.users WHERE id=NEW.user_id AND NOT COALESCE(is_anonymous,false)) THEN
  INSERT INTO public.member_operation_alerts(event_kind,source_id,payload) VALUES('registration',NEW.user_id,
    jsonb_build_object('name',NEW.display_name,'occurredAt',NEW.community_joined_at))
  ON CONFLICT(event_kind,source_id) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER member_operation_alert_registration AFTER INSERT OR UPDATE OF community_joined_at ON public.member_profiles FOR EACH ROW EXECUTE FUNCTION public.member_operation_alert_registration();

CREATE FUNCTION public.member_operation_alert_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing; person text;
BEGIN
 IF NEW.seller_kind<>'individual' OR NEW.status<>'published' OR OLD.status='published' THEN RETURN NEW; END IF;
 SELECT b.* INTO o FROM public.member_listing_billing b CROSS JOIN public.member_operation_alert_settings s
 WHERE s.singleton AND s.enabled AND b.listing_id=NEW.id AND b.billing_model='one_time_90d'
 AND b.status='active' AND NOT b.hold AND b.paid_at>=s.starts_at AND b.paid_until>now()
 AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=b.id AND c.paid)
 ORDER BY b.created_at DESC LIMIT 1;
 IF o.id IS NULL OR NOT public.member_listing_visible(NEW.id) THEN RETURN NEW; END IF;
 SELECT display_name INTO person FROM public.member_profiles WHERE user_id=NEW.user_id;
 INSERT INTO public.member_operation_alerts(event_kind,source_id,payload) VALUES('paid_listing',o.id,
  jsonb_build_object('name',COALESCE(person,'Anunciante'),'listingId',NEW.id,'title',NEW.title,
   'amountCents',o.amount_cents,'occurredAt',now(),'paidUntil',o.paid_until))
 ON CONFLICT(event_kind,source_id) DO NOTHING;
 RETURN NEW;
END $$;
CREATE TRIGGER member_operation_alert_publication AFTER UPDATE OF status ON public.member_bike_listings FOR EACH ROW EXECUTE FUNCTION public.member_operation_alert_publication();

CREATE FUNCTION public.member_operation_alert_claim() RETURNS SETOF public.member_operation_alerts LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE destination text; sender text;
BEGIN
 SELECT recipient INTO destination FROM public.member_operation_alert_settings WHERE singleton AND enabled;
 SELECT from_email INTO sender FROM public.newsletter_settings WHERE singleton;
 IF destination IS NULL OR sender IS NULL OR sender='' THEN RETURN; END IF;
 -- Resend retains idempotency keys for 24 hours. Never retry an ambiguous send beyond that protection.
 UPDATE public.member_operation_alerts SET status='needs_review',lease_token=NULL,lease_until=NULL,error_code='delivery_window_elapsed'
 WHERE status IN ('pending','sending') AND first_attempt_at<=now()-interval '23 hours' AND (lease_until IS NULL OR lease_until<now());
 RETURN QUERY UPDATE public.member_operation_alerts a SET status='sending',attempts=a.attempts+1,
 first_attempt_at=COALESCE(a.first_attempt_at,now()),lease_token=gen_random_uuid(),lease_until=now()+interval '2 minutes',
 delivery_from=COALESCE(a.delivery_from,sender),delivery_to=COALESCE(a.delivery_to,destination)
 WHERE a.id IN (SELECT id FROM public.member_operation_alerts WHERE status IN ('pending','sending')
  AND available_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY created_at,id LIMIT 2 FOR UPDATE SKIP LOCKED)
 RETURNING a.*;
END $$;
CREATE FUNCTION public.member_operation_alert_finish(p_id uuid,p_lease uuid,p_provider text DEFAULT NULL,p_error text DEFAULT NULL) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF p_provider IS NOT NULL AND p_provider!~'^[a-zA-Z0-9_-]{3,160}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
 IF p_provider IS NULL AND (p_error IS NULL OR p_error!~'^[a-z_]{1,60}$') THEN RAISE EXCEPTION 'invalid_input'; END IF;
 UPDATE public.member_operation_alerts SET
 status=CASE WHEN p_provider IS NOT NULL THEN 'sent' ELSE 'pending' END,
 provider_id=COALESCE(p_provider,provider_id),accepted_at=CASE WHEN p_provider IS NOT NULL THEN now() ELSE accepted_at END,
 error_code=p_error,lease_token=NULL,lease_until=NULL,
 available_at=now()+make_interval(secs=>least(3600,60*power(2,least(attempts,6)))::integer)
 WHERE id=p_id AND status='sending' AND lease_token=p_lease AND lease_until>now();
 RETURN FOUND;
END $$;
-- Persist the exact request before HTTP, so a template update cannot change a retry payload.
CREATE FUNCTION public.member_operation_alert_prepare(p_id uuid,p_lease uuid,p_body text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE a public.member_operation_alerts; body jsonb;
BEGIN
 SELECT * INTO a FROM public.member_operation_alerts WHERE id=p_id AND status='sending' AND lease_token=p_lease AND lease_until>now() FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'alert_lease_expired'; END IF;
 IF a.delivery_body IS NOT NULL THEN RETURN a.delivery_body; END IF;
 IF p_body IS NULL OR octet_length(p_body)>12000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 body:=p_body::jsonb;
 IF jsonb_typeof(body)<>'object' OR body->>'from' IS DISTINCT FROM a.delivery_from OR body->'to' IS DISTINCT FROM jsonb_build_array(a.delivery_to)
 OR jsonb_typeof(body->'subject') IS DISTINCT FROM 'string' OR jsonb_typeof(body->'text') IS DISTINCT FROM 'string'
 OR jsonb_typeof(body->'html') IS DISTINCT FROM 'string' THEN RAISE EXCEPTION 'invalid_input'; END IF;
 UPDATE public.member_operation_alerts SET delivery_body=p_body WHERE id=a.id;
 RETURN p_body;
END $$;
REVOKE ALL ON FUNCTION public.member_operation_alert_registration(),public.member_operation_alert_publication(),public.member_operation_alert_claim(),public.member_operation_alert_finish(uuid,uuid,text,text),public.member_operation_alert_prepare(uuid,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_operation_alert_claim(),public.member_operation_alert_finish(uuid,uuid,text,text),public.member_operation_alert_prepare(uuid,uuid,text) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
