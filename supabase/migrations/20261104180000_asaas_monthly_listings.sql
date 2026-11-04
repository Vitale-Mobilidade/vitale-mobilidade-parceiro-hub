BEGIN;
CREATE TABLE public.member_billing_settings(singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),enabled boolean NOT NULL DEFAULT false,signing_key bytea NOT NULL DEFAULT extensions.gen_random_bytes(32),last_health_at timestamptz,provider_ready boolean NOT NULL DEFAULT false);
INSERT INTO public.member_billing_settings(singleton) VALUES(true);
CREATE TABLE public.member_billing_customers(user_id uuid PRIMARY KEY REFERENCES auth.users(id),asaas_customer_id text UNIQUE NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.member_listing_billing(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid NOT NULL REFERENCES auth.users(id),listing_id uuid NOT NULL REFERENCES public.member_bike_listings(id),
 method text NOT NULL CHECK(method IN ('card','pix_automatic')),monthly_cents integer NOT NULL DEFAULT 15000 CHECK(monthly_cents=15000),
 status text NOT NULL DEFAULT 'creating' CHECK(status IN ('creating','pending','active','uncertain','cancel_pending','cancelled','failed')),
 listing_revision timestamptz NOT NULL,contact_consent_at timestamptz NOT NULL,monthly_accepted_at timestamptz NOT NULL,
 financial_started boolean NOT NULL DEFAULT false,customer_id text,subscription_id text UNIQUE,authorization_id text UNIQUE,conciliation_id text UNIQUE,
 payment_url text,pix_payload text,pix_image text,qr_expires_at timestamptz,renewal_status text,
 paid_until timestamptz,hold boolean NOT NULL DEFAULT false,cancel_requested_at timestamptz,cancelled_at timestamptz,
 lease_until timestamptz,lease_token uuid,attempts integer NOT NULL DEFAULT 0,next_attempt_at timestamptz NOT NULL DEFAULT now(),
 error_code text,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX member_billing_one_open_order ON public.member_listing_billing(listing_id) WHERE status NOT IN ('cancelled','failed');
CREATE TABLE public.member_listing_payment_cycles(payment_id text PRIMARY KEY,order_id uuid NOT NULL REFERENCES public.member_listing_billing(id),status text NOT NULL,paid boolean NOT NULL,due_date date NOT NULL,period_end timestamptz NOT NULL,observed_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX member_billing_cycles_order ON public.member_listing_payment_cycles(order_id);
CREATE TABLE public.member_billing_events(id text PRIMARY KEY,kind text NOT NULL,resource_id text NOT NULL,resource_type text NOT NULL CHECK(resource_type IN ('payment','subscription','authorization','instruction')),status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','done')),attempts integer NOT NULL DEFAULT 0,available_at timestamptz NOT NULL DEFAULT now(),lease_until timestamptz,lease_token uuid,created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX member_billing_events_pending ON public.member_billing_events(available_at) WHERE status<>'done';
DO $$ DECLARE t text;BEGIN FOREACH t IN ARRAY ARRAY['member_billing_settings','member_billing_customers','member_listing_billing','member_listing_payment_cycles','member_billing_events'] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);EXECUTE format('GRANT ALL ON public.%I TO service_role',t);END LOOP;END $$;
ALTER TABLE public.member_bike_listings DROP CONSTRAINT member_bike_listings_fee_status_check;
ALTER TABLE public.member_bike_listings ADD CONSTRAINT member_bike_listings_fee_status_check CHECK(fee_status IN ('pilot_exempt','required'));
ALTER TABLE public.member_bike_listings ALTER COLUMN fee_status SET DEFAULT 'required';

CREATE FUNCTION public.member_listing_entitled(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=p_id AND (
  l.fee_status='pilot_exempt' AND EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.singleton AND s.channel_seller_user_id=l.user_id)
  OR EXISTS(SELECT 1 FROM public.member_listing_billing o WHERE o.listing_id=l.id AND o.status='active' AND o.cancel_requested_at IS NULL AND NOT o.hold AND o.paid_until>now())
 ));
$$;
REVOKE ALL ON FUNCTION public.member_listing_entitled(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.member_billing_checkout(p_actor uuid,p_id uuid,p_method text,p_contact boolean,p_monthly boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.member_bike_listings;o public.member_listing_billing;
BEGIN
 IF NOT COALESCE((SELECT enabled AND provider_ready FROM public.member_billing_settings WHERE singleton),false) THEN RAISE EXCEPTION 'billing_unavailable';END IF;
 IF NOT public.member_classifieds_visible(p_actor) THEN RAISE EXCEPTION 'identity_verification_required';END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=p_id AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 SELECT * INTO o FROM public.member_listing_billing WHERE listing_id=p_id AND status NOT IN ('cancelled','failed') FOR UPDATE;
 IF FOUND THEN RETURN to_jsonb(o)||jsonb_build_object('reserved',false);END IF;
 IF p_method NOT IN ('card','pix_automatic') OR p_contact IS DISTINCT FROM true OR p_monthly IS DISTINCT FROM true THEN RAISE EXCEPTION 'billing_consent_required';END IF;
 IF l.status<>'draft' OR l.title='Minha bike' OR char_length(l.title)<6 OR l.brand='' OR l.model='' OR l.price_cents<100 OR l.city='' OR l.state='' OR l.mileage_km IS NULL OR char_length(l.description)<20 OR NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='ready') OR EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='reserved') THEN RAISE EXCEPTION 'listing_incomplete'; END IF;
 IF (SELECT count(*) FROM public.member_listing_billing WHERE user_id=p_actor AND created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'billing_rate_limited';END IF;
 UPDATE public.member_bike_listings SET fee_status='required' WHERE id=p_id;
 INSERT INTO public.member_listing_billing(user_id,listing_id,method,listing_revision,contact_consent_at,monthly_accepted_at,lease_until) VALUES(p_actor,p_id,p_method,l.updated_at,now(),now(),now()+interval '2 minutes') RETURNING * INTO o;
 RETURN to_jsonb(o)||jsonb_build_object('reserved',true);
END $$;

CREATE FUNCTION public.member_billing_close_on_listing_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status<>OLD.status AND NEW.status IN ('draft','sold','archived') THEN
  UPDATE public.member_listing_billing SET status='cancel_pending',cancel_requested_at=COALESCE(cancel_requested_at,now()),next_attempt_at=now(),updated_at=now() WHERE listing_id=NEW.id AND status NOT IN ('cancelled','failed');
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.member_billing_close_on_listing_change() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER member_billing_close_after_listing_change AFTER UPDATE OF status ON public.member_bike_listings FOR EACH ROW EXECUTE FUNCTION public.member_billing_close_on_listing_change();

CREATE FUNCTION public.member_billing_recalculate(p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing;until_date timestamptz;blocked boolean;
BEGIN
 PERFORM 1 FROM public.member_bike_listings WHERE id=(SELECT listing_id FROM public.member_listing_billing WHERE id=p_order) FOR UPDATE;
 SELECT * INTO o FROM public.member_listing_billing WHERE id=p_order FOR UPDATE;
 IF NOT FOUND THEN RETURN;END IF;
 SELECT max(period_end) FILTER(WHERE paid),COALESCE(bool_or(status IN ('REFUNDED','PARTIALLY_REFUNDED','REFUND_IN_PROGRESS','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE')),false) INTO until_date,blocked FROM public.member_listing_payment_cycles WHERE order_id=p_order;
 UPDATE public.member_listing_billing SET paid_until=until_date,hold=blocked,status=CASE WHEN status IN ('cancel_pending','cancelled','failed') THEN status WHEN until_date>now() AND NOT blocked THEN 'active' ELSE 'pending' END,updated_at=now() WHERE id=p_order;
 IF until_date>now() AND NOT blocked AND o.cancel_requested_at IS NULL AND o.status NOT IN ('cancel_pending','cancelled','failed') AND public.member_classifieds_visible(o.user_id) THEN
  UPDATE public.member_bike_listings SET status='published',contact_consent_at=o.contact_consent_at,published_at=now(),updated_at=now() WHERE id=o.listing_id AND user_id=o.user_id AND status='draft' AND updated_at=o.listing_revision;
 END IF;
 IF blocked THEN UPDATE public.member_listing_billing SET status='cancel_pending',cancel_requested_at=COALESCE(cancel_requested_at,now()),next_attempt_at=now() WHERE id=p_order AND status NOT IN ('cancelled','failed');END IF;
END $$;

CREATE FUNCTION public.member_billing_record_payment(p_order uuid,p_payment text,p_status text,p_paid boolean,p_due date,p_observed timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 INSERT INTO public.member_listing_payment_cycles(payment_id,order_id,status,paid,due_date,period_end,observed_at) VALUES(p_payment,p_order,p_status,p_paid,p_due,((p_due+interval '1 month'+interval '1 day') AT TIME ZONE 'America/Sao_Paulo'),p_observed)
 ON CONFLICT(payment_id) DO UPDATE SET status=excluded.status,paid=excluded.paid,observed_at=excluded.observed_at WHERE member_listing_payment_cycles.order_id=excluded.order_id AND member_listing_payment_cycles.observed_at<=excluded.observed_at;
 PERFORM public.member_billing_recalculate(p_order);
END $$;

CREATE FUNCTION public.member_billing_claim_events() RETURNS SETOF public.member_billing_events LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.member_billing_events SET status='processing',attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() WHERE id IN(SELECT id FROM public.member_billing_events WHERE (status='pending' OR status='processing' AND lease_until<now()) AND available_at<=now() ORDER BY created_at LIMIT 2 FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
CREATE FUNCTION public.member_billing_claim_cancellations() RETURNS SETOF public.member_listing_billing LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$ BEGIN
 UPDATE public.member_listing_billing SET status='uncertain',error_code='creation_uncertain',lease_until=NULL WHERE status='creating' AND lease_until<now();
 RETURN QUERY UPDATE public.member_listing_billing SET attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() WHERE id IN(SELECT id FROM public.member_listing_billing WHERE status='cancel_pending' AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *;
END $$;
CREATE FUNCTION public.member_billing_claim_uncertain() RETURNS SETOF public.member_listing_billing LANGUAGE sql SECURITY DEFINER SET search_path='' AS $$
 UPDATE public.member_listing_billing SET attempts=attempts+1,lease_until=now()+interval '2 minutes',lease_token=gen_random_uuid() WHERE id IN(SELECT id FROM public.member_listing_billing WHERE status='uncertain' AND next_attempt_at<=now() AND (lease_until IS NULL OR lease_until<now()) ORDER BY next_attempt_at LIMIT 1 FOR UPDATE SKIP LOCKED) RETURNING *;
$$;
CREATE FUNCTION public.member_billing_expire_periods() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o record;
BEGIN
 FOR o IN SELECT id,listing_id FROM public.member_listing_billing WHERE status IN ('active','pending','creating') AND (paid_until<=now() OR paid_until IS NULL AND created_at<now()-interval '24 hours') ORDER BY created_at LIMIT 10 LOOP
  PERFORM 1 FROM public.member_bike_listings WHERE id=o.listing_id FOR UPDATE;
  UPDATE public.member_listing_billing SET status='cancel_pending',cancel_requested_at=now(),next_attempt_at=now(),updated_at=now() WHERE id=o.id AND status IN ('active','pending','creating') AND (paid_until<=now() OR paid_until IS NULL AND created_at<now()-interval '24 hours');
  IF FOUND THEN UPDATE public.member_bike_listings SET status='draft',contact_consent_at=NULL,updated_at=now() WHERE id=o.listing_id AND status='published';END IF;
 END LOOP;
END $$;
CREATE FUNCTION public.member_billing_authorize(signature text,issued_at text) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE secret bytea;BEGIN
 IF signature IS NULL OR signature!~'^[a-f0-9]{64}$' OR issued_at IS NULL OR issued_at!~'^[0-9]{10}$' OR abs(extract(epoch FROM now())-issued_at::bigint)>180 THEN RETURN false;END IF;
 SELECT signing_key INTO secret FROM public.member_billing_settings WHERE singleton;
 RETURN signature=encode(extensions.hmac(convert_to(issued_at||':classifieds-billing','UTF8'),secret,'sha256'),'hex');
END $$;
CREATE FUNCTION public.member_billing_dispatch() RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE issued text;sig text;BEGIN
 issued:=floor(extract(epoch FROM clock_timestamp()))::bigint::text;
 SELECT encode(extensions.hmac(convert_to(issued||':classifieds-billing','UTF8'),signing_key,'sha256'),'hex') INTO sig FROM public.member_billing_settings WHERE singleton;
 RETURN net.http_post(url:='https://vitalemobilidade.com/api/public/classifieds-billing-worker',headers:=jsonb_build_object('Content-Type','application/json','x-worker-signature',sig,'x-worker-issued-at',issued),body:='{}'::jsonb,timeout_milliseconds:=60000);
END $$;
DO $$ DECLARE r record;BEGIN FOR r IN SELECT p.oid::regprocedure AS signature FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname LIKE 'member_billing_%' LOOP EXECUTE 'REVOKE ALL ON FUNCTION '||r.signature||' FROM PUBLIC,anon,authenticated';EXECUTE 'GRANT EXECUTE ON FUNCTION '||r.signature||' TO service_role';END LOOP;END $$;
-- Scheduler is installed disabled; activate only after the endpoint and secrets are verified.
DO $$ BEGIN IF EXISTS(SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN PERFORM cron.schedule('vitale-classifieds-billing','* * * * *','SELECT public.member_billing_dispatch();');PERFORM cron.alter_job(jobid,active:=false) FROM cron.job WHERE jobname='vitale-classifieds-billing';END IF;END $$;


CREATE OR REPLACE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('sellerType',CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=p_listing.user_id) THEN 'channel' ELSE 'individual' END,'id',p_listing.id,'title',p_listing.title,'brand',p_listing.brand,'model',p_listing.model,
 'priceCents',p_listing.price_cents,'city',p_listing.city,'state',p_listing.state,'modelYear',p_listing.model_year,
 'mileageKm',p_listing.mileage_km,'condition',p_listing.condition,'battery',p_listing.battery,'invoice',p_listing.invoice,
 'description',p_listing.description,'maintenance',p_listing.maintenance,'status',p_listing.status,
 'feeCents',p_listing.fee_cents,'feeStatus',CASE WHEN p_listing.fee_status='pilot_exempt' THEN 'pilot_exempt' WHEN public.member_listing_entitled(p_listing.id) THEN 'paid' ELSE 'required' END,'publishedAt',p_listing.published_at,'updatedAt',p_listing.updated_at,
 'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status',a.status) ORDER BY a.position,a.created_at)
 FROM public.member_media_assets a WHERE a.listing_id=p_listing.id AND a.status<>'removed'),'[]'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.member_classifieds(p_action text DEFAULT 'account',p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); profile public.member_profiles; listing public.member_bike_listings;
 asset public.member_media_assets; asset_id uuid; new_id uuid; position_number integer;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND NOT COALESCE(is_anonymous,false)) THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>12000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT * INTO profile FROM public.member_profiles WHERE user_id=actor FOR UPDATE;
 IF p_action='account' THEN
  RETURN jsonb_build_object('sellerType',CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=actor) THEN 'channel' ELSE 'individual' END,'displayName',profile.display_name,'communityJoined',profile.community_joined_at IS NOT NULL,
  'avatarId',profile.avatar_asset_id,'avatarPath',(SELECT object_path FROM public.member_media_assets WHERE id=profile.avatar_asset_id AND status='ready'),
  'canAdvertise',public.member_classifieds_pilot(actor) AND NOT COALESCE(profile.suspended,false),
  'canPublish',public.member_classifieds_visible(actor),'canUploadAvatar',profile.community_joined_at IS NOT NULL AND NOT profile.suspended AND (public.member_identity_verified(actor) OR public.member_classifieds_pilot(actor)));
 END IF;
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RAISE EXCEPTION 'community_disabled'; END IF;
 IF profile.community_joined_at IS NULL THEN RAISE EXCEPTION 'community_join_required'; END IF;
 IF profile.suspended THEN RAISE EXCEPTION 'account_suspended'; END IF;

 IF p_action IN ('reserve_avatar','remove_avatar') THEN
  IF NOT (public.member_identity_verified(actor) OR public.member_classifieds_pilot(actor)) THEN RAISE EXCEPTION 'identity_verification_required'; END IF;
  IF p_action='remove_avatar' THEN
   UPDATE public.member_media_assets SET status='removed' WHERE user_id=actor AND kind='avatar' AND status<>'removed';
   UPDATE public.member_profiles SET avatar_asset_id=NULL WHERE user_id=actor;
   RETURN jsonb_build_object('ok',true);
  END IF;
  IF EXISTS(SELECT 1 FROM public.member_media_assets WHERE user_id=actor AND kind='avatar' AND status<>'removed') THEN RAISE EXCEPTION 'avatar_remove_first'; END IF;
  IF (SELECT count(*) FROM public.member_media_assets WHERE user_id=actor AND created_at>now()-interval '24 hours')>=30 THEN RAISE EXCEPTION 'media_rate_limited'; END IF;
  asset_id:=gen_random_uuid();
  INSERT INTO public.member_media_assets(id,user_id,kind,object_path) VALUES(asset_id,actor,'avatar',actor::text||'/avatar/'||asset_id::text||'.webp') RETURNING * INTO asset;
  RETURN jsonb_build_object('id',asset.id,'path',asset.object_path);
 END IF;
 IF p_action='finalize_avatar' THEN
  SELECT * INTO asset FROM public.member_media_assets WHERE id=(p_payload->>'assetId')::uuid AND user_id=actor AND kind='avatar' AND status='reserved' FOR UPDATE;
  IF NOT FOUND OR NOT (public.member_identity_verified(actor) OR public.member_classifieds_pilot(actor)) THEN RAISE EXCEPTION 'forbidden'; END IF;
 ELSIF NOT public.member_classifieds_pilot(actor) THEN RAISE EXCEPTION 'classifieds_pilot_only';
 END IF;

 IF p_action='mine' THEN
  RETURN COALESCE((SELECT jsonb_agg(public.member_listing_json(l) ORDER BY l.created_at DESC) FROM public.member_bike_listings l WHERE l.user_id=actor),'[]'::jsonb);
 END IF;
 IF p_action='create' THEN
  SELECT * INTO listing FROM public.member_bike_listings l WHERE l.user_id=actor AND l.status='draft'
   AND l.title='Minha bike' AND l.brand='' AND l.model='' AND l.price_cents=0 AND l.city='' AND l.state=''
   AND l.model_year IS NULL AND l.mileage_km IS NULL AND l.description='' AND l.maintenance=''
   AND l.condition='good' AND l.battery='unknown' AND NOT l.invoice
   AND NOT EXISTS(SELECT 1 FROM public.member_media_assets a WHERE a.listing_id=l.id AND a.status<>'removed')
   ORDER BY l.created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN public.member_listing_json(listing); END IF;
  IF (SELECT count(*) FROM public.member_bike_listings WHERE user_id=actor AND status<>'archived')>=10 OR
   (SELECT count(*) FROM public.member_bike_listings WHERE user_id=actor AND created_at>now()-interval '24 hours')>=20 THEN RAISE EXCEPTION 'listing_limit'; END IF;
  INSERT INTO public.member_bike_listings(user_id,fee_status) VALUES(actor,CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=actor) THEN 'pilot_exempt' ELSE 'required' END) RETURNING * INTO listing;
  RETURN public.member_listing_json(listing);
 END IF;
 IF p_action<>'finalize_avatar' THEN
  SELECT * INTO listing FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND user_id=actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 END IF;
 IF p_action IN ('save','reserve_image','finalize_image','cover','remove_image') AND EXISTS(SELECT 1 FROM public.member_listing_billing o WHERE o.listing_id=listing.id AND o.status NOT IN ('cancelled','failed')) THEN RAISE EXCEPTION 'billing_pending';END IF;
 IF p_action='save' THEN
  IF listing.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
  IF char_length(btrim(COALESCE(p_payload->>'title',''))) NOT BETWEEN 0 AND 100 OR
   char_length(btrim(COALESCE(p_payload->>'title','')))=1 OR
   char_length(btrim(COALESCE(p_payload->>'brand','')))>60 OR char_length(btrim(COALESCE(p_payload->>'model','')))>80 OR
   char_length(btrim(COALESCE(p_payload->>'city','')))>80 OR char_length(btrim(COALESCE(p_payload->>'description','')))>4000 OR
   char_length(btrim(COALESCE(p_payload->>'maintenance','')))>1000 OR
   COALESCE((p_payload->>'priceCents')::integer,0)<0 OR
   (p_payload->>'modelYear')::integer>extract(year FROM now())::integer+1 OR
   p_payload->>'condition' IS NULL OR p_payload->>'battery' IS NULL OR p_payload->>'invoice' IS NULL
   THEN RAISE EXCEPTION 'listing_invalid'; END IF;
  UPDATE public.member_bike_listings SET title=COALESCE(NULLIF(btrim(p_payload->>'title'),''),'Minha bike'),brand=btrim(COALESCE(p_payload->>'brand','')),model=btrim(COALESCE(p_payload->>'model','')),
   price_cents=COALESCE((p_payload->>'priceCents')::integer,0),city=btrim(COALESCE(p_payload->>'city','')),state=COALESCE(p_payload->>'state',''),model_year=(p_payload->>'modelYear')::integer,
   mileage_km=(p_payload->>'mileageKm')::integer,condition=p_payload->>'condition',battery=p_payload->>'battery',invoice=(p_payload->>'invoice')::boolean,
   description=btrim(COALESCE(p_payload->>'description','')),maintenance=btrim(COALESCE(p_payload->>'maintenance','')),updated_at=now() WHERE id=listing.id RETURNING * INTO listing;
 ELSIF p_action='publish' THEN
  IF NOT public.member_classifieds_visible(actor) THEN RAISE EXCEPTION 'identity_verification_required'; END IF;
  IF listing.status<>'draft' OR listing.title='Minha bike' OR char_length(listing.title)<6 OR listing.brand='' OR listing.model='' OR listing.price_cents<100 OR listing.city='' OR listing.state='' OR listing.mileage_km IS NULL OR char_length(listing.description)<20 OR
   NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=listing.id AND status='ready') OR
   EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=listing.id AND status='reserved') THEN RAISE EXCEPTION 'listing_incomplete'; END IF;
  IF NOT public.member_listing_entitled(listing.id) THEN RAISE EXCEPTION 'billing_required';END IF;
  IF p_payload->'contactConsent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'listing_contact_consent'; END IF;
  UPDATE public.member_bike_listings SET status='published',contact_consent_at=now(),published_at=now(),updated_at=now() WHERE id=listing.id RETURNING * INTO listing;
 ELSIF p_action IN ('withdraw','sold','archive') THEN
  IF p_action='sold' AND listing.status<>'published' THEN RAISE EXCEPTION 'listing_not_published'; END IF;
  UPDATE public.member_bike_listings SET status=CASE p_action WHEN 'withdraw' THEN 'draft' WHEN 'sold' THEN 'sold' ELSE 'archived' END,
   contact_consent_at=NULL,updated_at=now() WHERE id=listing.id RETURNING * INTO listing;
 ELSIF p_action='reserve_image' THEN
  IF listing.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
  IF (SELECT count(*) FROM public.member_media_assets WHERE listing_id=listing.id AND status<>'removed')>=5 THEN RAISE EXCEPTION 'listing_image_limit'; END IF;
  IF (SELECT count(*) FROM public.member_media_assets WHERE user_id=actor AND created_at>now()-interval '24 hours')>=30 THEN RAISE EXCEPTION 'media_rate_limited'; END IF;
  SELECT n INTO position_number FROM generate_series(0,4) n WHERE NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=listing.id AND status<>'removed' AND position=n) ORDER BY n LIMIT 1;
  asset_id:=gen_random_uuid();
  INSERT INTO public.member_media_assets(id,user_id,kind,listing_id,position,object_path)
  VALUES(asset_id,actor,'listing',listing.id,position_number,actor::text||'/listings/'||listing.id::text||'/'||asset_id::text||'.webp') RETURNING * INTO asset;
  RETURN jsonb_build_object('id',asset.id,'path',asset.object_path);
 ELSIF p_action IN ('finalize_image','remove_image','cover') THEN
  IF listing.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
  SELECT * INTO asset FROM public.member_media_assets WHERE id=(p_payload->>'assetId')::uuid AND user_id=actor AND listing_id=listing.id AND status<>'removed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
  IF p_action='remove_image' THEN
   UPDATE public.member_media_assets SET status='removed' WHERE id=asset.id;
  ELSIF p_action='cover' THEN
   IF asset.status<>'ready' THEN RAISE EXCEPTION 'media_not_ready'; END IF;
   UPDATE public.member_media_assets SET position=asset.position WHERE listing_id=listing.id AND position=0 AND status<>'removed' AND id<>asset.id;
   UPDATE public.member_media_assets SET position=0 WHERE id=asset.id;
  END IF;
 ELSIF p_action<>'finalize_avatar' THEN RAISE EXCEPTION 'invalid_input';
 END IF;
 IF p_action IN ('finalize_image','finalize_avatar') THEN
  IF asset.status<>'reserved' OR asset.created_at<now()-interval '15 minutes' OR NOT EXISTS(
   SELECT 1 FROM storage.objects o WHERE o.bucket_id='member-media' AND o.name=asset.object_path
   AND (o.metadata->>'size')::bigint BETWEEN 1 AND 2097152 AND o.metadata->>'mimetype'='image/webp') THEN RAISE EXCEPTION 'media_not_ready'; END IF;
  UPDATE public.member_media_assets SET status='ready' WHERE id=asset.id;
  IF p_action='finalize_avatar' THEN
   UPDATE public.member_profiles SET avatar_asset_id=asset.id,updated_at=now() WHERE user_id=actor;
   RETURN jsonb_build_object('ok',true);
  END IF;
 END IF;
 RETURN public.member_listing_json(listing);
END $$;

CREATE OR REPLACE FUNCTION public.member_bike_listings_public(p_id uuid DEFAULT NULL,p_limit integer DEFAULT 12,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH visible AS (
  SELECT l.*,p.display_name,a.object_path avatar_path,v.phone_number FROM public.member_bike_listings l
  JOIN public.member_profiles p ON p.user_id=l.user_id
  JOIN public.member_identity_verifications v ON v.user_id=l.user_id
  LEFT JOIN public.member_media_assets a ON a.id=p.avatar_asset_id AND a.status='ready'
  WHERE l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id)
   AND (p_id IS NULL OR l.id=p_id)
 ), items AS (
  SELECT * FROM visible ORDER BY published_at DESC,id LIMIT greatest(1,least(COALESCE(p_limit,12),100)) OFFSET greatest(0,least(COALESCE(p_offset,0),10000))
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM visible),'items',COALESCE((SELECT jsonb_agg(
  (public.member_listing_json(l)-'images') || jsonb_build_object('sellerName',CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=i.user_id) THEN 'Vitale Mobilidade' ELSE i.display_name END,'avatarPath',i.avatar_path,
   'whatsapp',replace(i.phone_number,'+',''),
   'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status','ready') ORDER BY a.position,a.created_at) FROM public.member_media_assets a WHERE a.listing_id=i.id AND a.status='ready'),'[]'::jsonb))
  ORDER BY i.published_at DESC,i.id) FROM items i JOIN public.member_bike_listings l ON l.id=i.id),'[]'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.member_bike_image_public(p_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.object_path FROM public.member_media_assets a WHERE a.id=p_id AND a.status='ready' AND (
  EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id))
  OR (a.kind='avatar' AND EXISTS(SELECT 1 FROM public.member_profiles p JOIN public.member_bike_listings l ON l.user_id=p.user_id WHERE p.avatar_asset_id=a.id AND l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id)))
 );
$$;

CREATE OR REPLACE FUNCTION public.member_media_access(p_path text,p_operation text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_media_assets a
 JOIN public.member_profiles p ON p.user_id=a.user_id
 WHERE a.object_path=p_path AND NOT p.suspended AND p.community_joined_at IS NOT NULL
 AND (SELECT enabled FROM public.member_community_settings WHERE singleton)
 AND CASE p_operation
  WHEN 'insert' THEN a.user_id=auth.uid() AND a.status='reserved' AND a.created_at>now()-interval '15 minutes'
   AND CASE WHEN a.kind='listing' THEN public.member_classifieds_pilot(a.user_id) ELSE public.member_identity_verified(a.user_id) OR public.member_classifieds_pilot(a.user_id) END
  WHEN 'delete' THEN a.user_id=auth.uid() AND (a.kind='avatar' OR EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.status<>'published'))
  WHEN 'select' THEN a.user_id=auth.uid() OR (a.status='ready' AND (
   EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id))
   OR (a.kind='avatar' AND p.avatar_asset_id=a.id AND EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.user_id=a.user_id AND l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id)))
  ))
  ELSE false END);
$$;
COMMIT;
