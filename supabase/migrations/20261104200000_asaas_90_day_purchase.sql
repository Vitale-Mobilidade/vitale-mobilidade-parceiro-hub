BEGIN;
-- Legacy rows retain their financial model; no historical orders are converted.
ALTER TABLE public.member_billing_settings ADD COLUMN purchase_ready boolean NOT NULL DEFAULT false;
UPDATE public.member_billing_settings SET enabled=false,hosted_ready=false;
ALTER TABLE public.member_listing_billing
 ADD COLUMN billing_model text NOT NULL DEFAULT 'legacy_recurring' CHECK(billing_model IN ('legacy_recurring','one_time_90d')),
 ADD COLUMN amount_cents integer NOT NULL DEFAULT 15000 CHECK(amount_cents=15000),
 ADD COLUMN display_days integer NOT NULL DEFAULT 90 CHECK(display_days=90),
 ADD COLUMN purchase_accepted_at timestamptz,
 ADD COLUMN paid_at timestamptz,
 ADD COLUMN display_started_at timestamptz,
 ADD COLUMN publish_requested boolean NOT NULL DEFAULT false;
ALTER TABLE public.member_listing_billing ALTER COLUMN billing_model SET DEFAULT 'one_time_90d';
ALTER TABLE public.member_listing_billing ADD CONSTRAINT member_purchase_no_subscription CHECK(billing_model<>'one_time_90d' OR (method='hosted' AND subscription_id IS NULL AND authorization_id IS NULL));
ALTER TABLE public.member_listing_billing DROP CONSTRAINT member_listing_billing_status_check;
ALTER TABLE public.member_listing_billing ADD CONSTRAINT member_listing_billing_status_check CHECK(status IN ('creating','pending','active','uncertain','cancel_pending','cancelled','failed','expired'));
DROP INDEX public.member_billing_one_open_order;
CREATE UNIQUE INDEX member_billing_one_open_order ON public.member_listing_billing(listing_id) WHERE status NOT IN ('cancelled','failed','expired');
ALTER TABLE public.member_listing_payment_cycles ALTER COLUMN period_end DROP NOT NULL;

-- Cached monthly clients cannot reserve a one-time purchase under old terms.
CREATE OR REPLACE FUNCTION public.member_billing_checkout(p_actor uuid,p_id uuid,p_method text,p_contact boolean,p_monthly boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN RAISE EXCEPTION 'billing_model_changed'; END $$;

CREATE FUNCTION public.member_billing_purchase(p_actor uuid,p_id uuid,p_contact boolean,p_accepted boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.member_bike_listings;o public.member_listing_billing;
BEGIN
 IF NOT COALESCE((SELECT enabled AND provider_ready AND purchase_ready FROM public.member_billing_settings WHERE singleton),false) THEN RAISE EXCEPTION 'billing_unavailable';END IF;
 IF NOT public.member_classifieds_visible(p_actor) THEN RAISE EXCEPTION 'identity_verification_required';END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=p_id AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable';END IF;
 SELECT * INTO o FROM public.member_listing_billing WHERE listing_id=p_id AND status NOT IN ('cancelled','failed','expired') FOR UPDATE;
 IF FOUND THEN RETURN to_jsonb(o)||jsonb_build_object('reserved',false);END IF;
 IF p_contact IS DISTINCT FROM true OR p_accepted IS DISTINCT FROM true THEN RAISE EXCEPTION 'billing_consent_required';END IF;
 IF l.status<>'draft' OR l.title='Minha bike' OR char_length(l.title)<6 OR l.brand='' OR l.model='' OR l.price_cents<100 OR l.city='' OR l.state='' OR l.mileage_km IS NULL OR char_length(l.description)<20 OR NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='ready') OR EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='reserved') THEN RAISE EXCEPTION 'listing_incomplete';END IF;
 IF (SELECT count(*) FROM public.member_listing_billing WHERE user_id=p_actor AND created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'billing_rate_limited';END IF;
 UPDATE public.member_bike_listings SET fee_status='required' WHERE id=p_id;
 INSERT INTO public.member_listing_billing(user_id,listing_id,method,listing_revision,contact_consent_at,monthly_accepted_at,purchase_accepted_at,publish_requested,lease_until)
 VALUES(p_actor,p_id,'hosted',l.updated_at,now(),now(),now(),true,now()+interval '2 minutes') RETURNING * INTO o;
 RETURN to_jsonb(o)||jsonb_build_object('reserved',true);
END $$;
REVOKE ALL ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.member_listing_entitled(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_listing_billing o WHERE o.listing_id=p_id AND o.billing_model='one_time_90d' AND o.status='active' AND NOT o.hold AND o.paid_at IS NOT NULL AND (o.paid_until IS NULL OR o.paid_until>now()) AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=o.id AND c.paid));
$$;

-- The first publication starts the fixed window. Editing/republication never resets it.
CREATE FUNCTION public.member_billing_start_display() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing;
BEGIN
 IF NEW.status='published' AND OLD.status<>'published' THEN
  SELECT * INTO o FROM public.member_listing_billing WHERE listing_id=NEW.id AND billing_model='one_time_90d' AND status='active' FOR UPDATE;
  IF NOT FOUND OR NOT public.member_listing_entitled(NEW.id) THEN RAISE EXCEPTION 'billing_required';END IF;
  IF o.display_started_at IS NULL THEN
   UPDATE public.member_listing_billing SET display_started_at=now(),paid_until=now()+interval '2160 hours',publish_requested=false,updated_at=now() WHERE id=o.id;
  ELSE
   UPDATE public.member_listing_billing SET publish_requested=false WHERE id=o.id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.member_billing_start_display() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER member_billing_start_display BEFORE UPDATE OF status ON public.member_bike_listings FOR EACH ROW EXECUTE FUNCTION public.member_billing_start_display();

CREATE OR REPLACE FUNCTION public.member_billing_close_on_listing_change() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.status IN ('draft','sold','archived') THEN
  -- Also catches withdrawal of an already-draft ad while checkout is pending.
  UPDATE public.member_listing_billing SET publish_requested=false,
   status=CASE WHEN paid_at IS NULL AND status IN ('creating','pending','uncertain') THEN 'cancel_pending' ELSE status END,
   cancel_requested_at=CASE WHEN paid_at IS NULL AND status IN ('creating','pending','uncertain') THEN COALESCE(cancel_requested_at,now()) ELSE cancel_requested_at END,
   next_attempt_at=now(),updated_at=now()
  WHERE listing_id=NEW.id AND billing_model='one_time_90d' AND status NOT IN ('cancelled','failed','expired');
 END IF;
 RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.member_billing_recalculate(p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing;valid_paid boolean;blocked boolean;
BEGIN
 PERFORM 1 FROM public.member_bike_listings WHERE id=(SELECT listing_id FROM public.member_listing_billing WHERE id=p_order) FOR UPDATE;
 SELECT * INTO o FROM public.member_listing_billing WHERE id=p_order FOR UPDATE;
 IF NOT FOUND OR o.billing_model<>'one_time_90d' THEN RETURN;END IF;
 SELECT COALESCE(bool_or(paid),false),COALESCE(bool_or(status IN ('REFUNDED','PARTIALLY_REFUNDED','REFUND_IN_PROGRESS','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE')),false)
 INTO valid_paid,blocked FROM public.member_listing_payment_cycles WHERE order_id=p_order;
 UPDATE public.member_listing_billing SET
  paid_at=CASE WHEN valid_paid AND NOT blocked THEN COALESCE(paid_at,now()) ELSE paid_at END,
  hold=blocked,
  status=CASE WHEN paid_until<=now() THEN 'expired' WHEN valid_paid AND NOT blocked THEN 'active' WHEN status IN ('cancel_pending','cancelled','failed','expired') THEN status ELSE 'pending' END,
  lease_until=NULL,lease_token=NULL,updated_at=now() WHERE id=p_order;
 IF valid_paid AND NOT blocked AND (o.paid_until IS NULL OR o.paid_until>now()) AND o.publish_requested AND o.cancel_requested_at IS NULL AND public.member_classifieds_visible(o.user_id) THEN
  UPDATE public.member_bike_listings SET status='published',contact_consent_at=o.contact_consent_at,published_at=now(),updated_at=now()
  WHERE id=o.listing_id AND user_id=o.user_id AND status='draft' AND updated_at=o.listing_revision;
 END IF;
 IF (blocked OR NOT valid_paid OR o.paid_until<=now()) AND NOT public.member_listing_entitled(o.listing_id) THEN
  UPDATE public.member_bike_listings SET status='draft',contact_consent_at=NULL,updated_at=now() WHERE id=o.listing_id AND status='published';
 END IF;
END $$;

CREATE OR REPLACE FUNCTION public.member_billing_record_payment(p_order uuid,p_payment text,p_status text,p_paid boolean,p_due date,p_observed timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM 1 FROM public.member_bike_listings WHERE id=(SELECT listing_id FROM public.member_listing_billing WHERE id=p_order) FOR UPDATE;
 PERFORM 1 FROM public.member_listing_billing WHERE id=p_order AND billing_model='one_time_90d' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'billing_model_changed';END IF;
 INSERT INTO public.member_listing_payment_cycles(payment_id,order_id,status,paid,due_date,period_end,observed_at) VALUES(p_payment,p_order,p_status,p_paid,p_due,NULL,p_observed)
 ON CONFLICT(payment_id) DO UPDATE SET status=excluded.status,paid=excluded.paid,observed_at=excluded.observed_at WHERE member_listing_payment_cycles.order_id=excluded.order_id AND member_listing_payment_cycles.observed_at<=excluded.observed_at;
 PERFORM public.member_billing_recalculate(p_order);
END $$;

CREATE OR REPLACE FUNCTION public.member_billing_expire_periods() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o record;
BEGIN
 FOR o IN SELECT id,listing_id FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND status NOT IN ('expired','failed','cancelled') AND paid_until<=now() ORDER BY paid_until LIMIT 20 LOOP
  PERFORM 1 FROM public.member_bike_listings WHERE id=o.listing_id FOR UPDATE;
  UPDATE public.member_listing_billing SET status='expired',publish_requested=false,updated_at=now() WHERE id=o.id AND paid_until<=now();
  IF FOUND THEN UPDATE public.member_bike_listings SET status='draft',contact_consent_at=NULL,updated_at=now() WHERE id=o.listing_id AND status='published';END IF;
 END LOOP;
 UPDATE public.member_listing_billing SET status='cancel_pending',publish_requested=false,cancel_requested_at=COALESCE(cancel_requested_at,now()),next_attempt_at=now()
 WHERE billing_model='one_time_90d' AND paid_at IS NULL AND status IN ('pending','uncertain') AND checkout_expires_at<=now();
END $$;

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
  INSERT INTO public.member_bike_listings(user_id,fee_status) VALUES(actor,'required') RETURNING * INTO listing;
  RETURN public.member_listing_json(listing);
 END IF;
 IF p_action<>'finalize_avatar' THEN
  SELECT * INTO listing FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND user_id=actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 END IF;
 IF p_action IN ('save','reserve_image','finalize_image','cover','remove_image') AND EXISTS(SELECT 1 FROM public.member_listing_billing o WHERE o.listing_id=listing.id AND o.status NOT IN ('cancelled','failed','expired') AND o.paid_at IS NULL) THEN RAISE EXCEPTION 'billing_pending';END IF;
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


CREATE OR REPLACE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('sellerType',CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=p_listing.user_id) THEN 'channel' ELSE 'individual' END,'id',p_listing.id,'title',p_listing.title,'brand',p_listing.brand,'model',p_listing.model,
 'priceCents',p_listing.price_cents,'city',p_listing.city,'state',p_listing.state,'modelYear',p_listing.model_year,
 'mileageKm',p_listing.mileage_km,'condition',p_listing.condition,'battery',p_listing.battery,'invoice',p_listing.invoice,
 'description',p_listing.description,'maintenance',p_listing.maintenance,'status',p_listing.status,
 'feeCents',p_listing.fee_cents,'feeStatus',CASE WHEN public.member_listing_entitled(p_listing.id) THEN 'paid' ELSE 'required' END,'displayExpiresAt',(SELECT o.paid_until FROM public.member_listing_billing o WHERE o.listing_id=p_listing.id AND o.billing_model='one_time_90d' ORDER BY o.created_at DESC LIMIT 1),'publishedAt',p_listing.published_at,'updatedAt',p_listing.updated_at,
 'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status',a.status) ORDER BY a.position,a.created_at)
 FROM public.member_media_assets a WHERE a.listing_id=p_listing.id AND a.status<>'removed'),'[]'::jsonb));
$$;

COMMIT;
