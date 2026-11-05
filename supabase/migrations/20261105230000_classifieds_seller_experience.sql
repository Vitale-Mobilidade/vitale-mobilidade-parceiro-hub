BEGIN;
ALTER TABLE public.member_bike_listings
 ADD COLUMN whatsapp_message text NOT NULL DEFAULT '' CHECK(char_length(whatsapp_message)<=600),
 ADD COLUMN confirmed_phone text,
 ADD COLUMN contact_confirmed_at timestamptz;
-- Preserve existing published contacts while binding future public contact to that snapshot.
UPDATE public.member_bike_listings l SET confirmed_phone=replace(v.phone_number,'+',''),contact_confirmed_at=l.contact_consent_at
 FROM public.member_identity_verifications v WHERE v.user_id=l.user_id AND l.seller_kind='individual' AND l.status='published' AND l.contact_consent_at IS NOT NULL AND v.phone_verified_at IS NOT NULL;
ALTER FUNCTION public.member_listing_visible(uuid) RENAME TO member_listing_visible_before_seller_experience;
CREATE FUNCTION public.member_listing_visible(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.member_listing_visible_before_seller_experience(p_id) AND EXISTS(SELECT 1 FROM public.member_bike_listings l LEFT JOIN public.member_identity_verifications v ON v.user_id=l.user_id WHERE l.id=p_id AND (l.seller_kind='channel' OR (l.contact_confirmed_at IS NOT NULL AND l.confirmed_phone=replace(v.phone_number,'+','') AND v.phone_verified_at IS NOT NULL)));
$$;
REVOKE ALL ON FUNCTION public.member_listing_visible(uuid),public.member_listing_visible_before_seller_experience(uuid) FROM PUBLIC,anon,authenticated;
-- Financial identity stays intact when a paid slot is assigned to another bike.
ALTER TABLE public.member_listing_billing ADD COLUMN purchased_listing_id uuid REFERENCES public.member_bike_listings(id);
UPDATE public.member_listing_billing SET purchased_listing_id=listing_id;
ALTER TABLE public.member_listing_billing ALTER COLUMN purchased_listing_id SET NOT NULL;
CREATE FUNCTION public.member_billing_capture_origin() RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $$
BEGIN NEW.purchased_listing_id:=NEW.listing_id; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.member_billing_capture_origin() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER member_billing_capture_origin BEFORE INSERT ON public.member_listing_billing FOR EACH ROW EXECUTE FUNCTION public.member_billing_capture_origin();
CREATE TABLE public.member_listing_period_transfers (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id uuid NOT NULL REFERENCES public.member_listing_billing(id),
 user_id uuid NOT NULL REFERENCES auth.users(id),
 from_listing_id uuid NOT NULL REFERENCES public.member_bike_listings(id),
 to_listing_id uuid NOT NULL REFERENCES public.member_bike_listings(id),
 transferred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_listing_period_transfers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_listing_period_transfers FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_listing_period_transfers TO service_role;

CREATE FUNCTION public.member_available_periods(p_actor uuid,p_target uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',o.id,'listingTitle',l.title,'paidUntil',o.paid_until) ORDER BY o.paid_until NULLS LAST,o.created_at),'[]'::jsonb)
 FROM public.member_listing_billing o JOIN public.member_bike_listings l ON l.id=o.listing_id
 WHERE o.user_id=p_actor AND l.user_id=p_actor AND l.seller_kind='individual' AND l.status<>'published' AND o.listing_id<>p_target
 AND o.billing_model='one_time_90d' AND o.status='active' AND NOT o.hold AND o.paid_at IS NOT NULL AND (o.paid_until IS NULL OR o.paid_until>now())
 AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=o.id AND c.paid);
$$;
REVOKE ALL ON FUNCTION public.member_available_periods(uuid,uuid) FROM PUBLIC,anon,authenticated;

-- Source and target locks plus the per-owner lock serialize competing claims and publications.
CREATE FUNCTION public.member_claim_period(p_actor uuid,p_target uuid,p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing; target public.member_bike_listings; source public.member_bike_listings;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,9150));
 SELECT * INTO o FROM public.member_listing_billing WHERE id=p_order AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 PERFORM 1 FROM public.member_bike_listings WHERE id IN (p_target,o.listing_id) ORDER BY id FOR UPDATE;
 SELECT * INTO target FROM public.member_bike_listings WHERE id=p_target AND user_id=p_actor AND seller_kind='individual';
 SELECT * INTO source FROM public.member_bike_listings WHERE id=o.listing_id AND user_id=p_actor AND seller_kind='individual';
 IF target.id IS NULL OR source.id IS NULL THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 IF o.listing_id=p_target THEN RETURN; END IF;
 IF source.status='published' THEN RAISE EXCEPTION 'period_in_use'; END IF;
 IF target.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
 IF NOT public.member_listing_entitled(source.id) OR o.status<>'active' OR o.hold OR o.paid_at IS NULL OR (o.paid_until IS NOT NULL AND o.paid_until<=now()) THEN RAISE EXCEPTION 'billing_required'; END IF;
 -- Expired paid slots may be replaced; unresolved unpaid checkouts must be cancelled first.
 UPDATE public.member_listing_billing SET status='expired',publish_requested=false WHERE listing_id=p_target AND billing_model='one_time_90d' AND paid_at IS NOT NULL AND paid_until<=now();
 IF EXISTS(SELECT 1 FROM public.member_listing_billing WHERE listing_id=p_target AND status NOT IN ('cancelled','failed','expired')) THEN RAISE EXCEPTION 'billing_pending'; END IF;
 INSERT INTO public.member_listing_period_transfers(order_id,user_id,from_listing_id,to_listing_id) VALUES(o.id,p_actor,o.listing_id,p_target);
 UPDATE public.member_listing_billing SET listing_id=p_target,listing_revision=target.updated_at,publish_requested=false,updated_at=now() WHERE id=o.id;
END $$;
REVOKE ALL ON FUNCTION public.member_claim_period(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;

-- Private per-browser/day counts. No IP, account ID, name, phone or email is recorded.
CREATE TABLE public.member_listing_events (
 listing_id uuid NOT NULL REFERENCES public.member_bike_listings(id) ON DELETE CASCADE,
 event text NOT NULL CHECK(event IN ('impression','visit','whatsapp')),
 day date NOT NULL DEFAULT (now() AT TIME ZONE 'America/Sao_Paulo')::date,
 visitor_key text NOT NULL,
 PRIMARY KEY(listing_id,event,day,visitor_key)
);
CREATE INDEX member_listing_events_day ON public.member_listing_events(listing_id,day);
ALTER TABLE public.member_listing_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_listing_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_listing_events TO service_role;
CREATE FUNCTION public.member_listing_track(p_id uuid,p_event text,p_visitor uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.member_bike_listings; d date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF p_event NOT IN ('impression','visit','whatsapp') OR p_event IS NULL OR p_visitor IS NULL THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=p_id AND status='published';
 IF NOT FOUND OR l.user_id=auth.uid() OR NOT public.member_listing_entitled(l.id) OR NOT public.member_listing_visible(l.id) OR l.contact_consent_at IS NULL THEN RETURN; END IF;
 IF (SELECT count(*) FROM public.member_listing_events WHERE listing_id=p_id AND day=d)>=20000 THEN RETURN; END IF;
 INSERT INTO public.member_listing_events(listing_id,event,day,visitor_key) VALUES(p_id,p_event,d,md5(p_id::text||d::text||p_visitor::text)) ON CONFLICT DO NOTHING;
END $$;
REVOKE ALL ON FUNCTION public.member_listing_track(uuid,text,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_listing_track(uuid,text,uuid) TO anon,authenticated;
CREATE FUNCTION public.member_listing_metrics(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('impressions',count(*) FILTER(WHERE event='impression'),'visits',count(*) FILTER(WHERE event='visit'),'whatsappClicks',count(*) FILTER(WHERE event='whatsapp')) FROM public.member_listing_events WHERE listing_id=p_id;
$$;
REVOKE ALL ON FUNCTION public.member_listing_metrics(uuid) FROM PUBLIC,anon,authenticated;

-- Extend the existing projection rather than duplicating the listing writer.
ALTER FUNCTION public.member_listing_json(public.member_bike_listings) RENAME TO member_listing_json_before_seller_experience;
CREATE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.member_listing_json_before_seller_experience(p_listing)||jsonb_build_object('whatsappMessage',p_listing.whatsapp_message,'contactConfirmed',p_listing.contact_confirmed_at IS NOT NULL);
$$;
REVOKE ALL ON FUNCTION public.member_listing_json(public.member_bike_listings),public.member_listing_json_before_seller_experience(public.member_bike_listings) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.member_listing_reorder(p_id uuid,p_images jsonb) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE n integer; ids uuid[];
BEGIN
 IF jsonb_typeof(p_images)<>'array' OR jsonb_array_length(p_images) NOT BETWEEN 1 AND 5 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT array_agg(value::uuid ORDER BY ord) INTO ids FROM jsonb_array_elements_text(p_images) WITH ORDINALITY AS items(value,ord);
 SELECT count(*) INTO n FROM public.member_media_assets WHERE listing_id=p_id AND status='ready';
 IF cardinality(ids)<>n OR (SELECT count(DISTINCT x) FROM unnest(ids) x)<>n OR EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=p_id AND status='reserved') OR
 (SELECT count(*) FROM public.member_media_assets WHERE listing_id=p_id AND status='ready' AND id=ANY(ids))<>n THEN RAISE EXCEPTION 'invalid_input'; END IF;
 UPDATE public.member_media_assets a SET position=array_position(ids,a.id)-1 WHERE a.listing_id=p_id AND a.status='ready';
END $$;
REVOKE ALL ON FUNCTION public.member_listing_reorder(uuid,jsonb) FROM PUBLIC,anon,authenticated;

ALTER FUNCTION public.member_classifieds(text,jsonb) RENAME TO member_classifieds_before_seller_experience;
REVOKE ALL ON FUNCTION public.member_classifieds_before_seller_experience(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_classifieds(p_action text DEFAULT 'account',p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); base jsonb; l public.member_bike_listings; phone text; msg text;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,9150));
 -- Existing gate handles account status, community membership and suspension first.
 base:=public.member_classifieds_before_seller_experience('account','{}');
 IF p_action='account' THEN
  SELECT replace(phone_number,'+','') INTO phone FROM public.member_identity_verifications WHERE user_id=actor AND phone_verified_at IS NOT NULL;
  RETURN base||jsonb_build_object('verifiedPhone',phone);
 END IF;
 IF p_action='mine' THEN
  base:=public.member_classifieds_before_seller_experience(p_action,p_payload);
  RETURN COALESCE((SELECT jsonb_agg(x||jsonb_build_object('metrics',public.member_listing_metrics((x->>'id')::uuid))) FROM jsonb_array_elements(base) x),'[]'::jsonb);
 END IF;
 IF p_action NOT IN ('periods','claim_period','reorder','save','publish') THEN RETURN public.member_classifieds_before_seller_experience(p_action,p_payload); END IF;
 IF NOT public.member_classifieds_pilot(actor) THEN RAISE EXCEPTION 'classifieds_pilot_only'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>12000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND user_id=actor AND seller_kind='individual' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 IF p_action='periods' THEN RETURN public.member_available_periods(actor,l.id); END IF;
 IF p_action='claim_period' THEN PERFORM public.member_claim_period(actor,l.id,(p_payload->>'orderId')::uuid); RETURN public.member_listing_json(l); END IF;
 IF p_action='reorder' THEN
  IF l.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
  IF EXISTS(SELECT 1 FROM public.member_listing_billing WHERE listing_id=l.id AND paid_at IS NULL AND status NOT IN ('cancelled','failed','expired')) THEN RAISE EXCEPTION 'billing_pending'; END IF;
  PERFORM public.member_listing_reorder(l.id,p_payload->'imageIds');
  RETURN public.member_listing_json(l);
 END IF;
 SELECT replace(phone_number,'+','') INTO phone FROM public.member_identity_verifications WHERE user_id=actor AND phone_verified_at IS NOT NULL;
 IF p_action='save' THEN
  msg:=btrim(COALESCE(p_payload->>'whatsappMessage',l.whatsapp_message,''));
  IF char_length(msg)>600 THEN RAISE EXCEPTION 'listing_invalid'; END IF;
  IF p_payload->'confirmContact'='true'::jsonb AND (NOT public.member_identity_verified(actor) OR phone IS NULL OR phone IS DISTINCT FROM p_payload->>'contactPhone') THEN RAISE EXCEPTION 'listing_phone_confirmation'; END IF;
  base:=public.member_classifieds_before_seller_experience(p_action,p_payload);
  UPDATE public.member_bike_listings SET whatsapp_message=msg,
   confirmed_phone=CASE WHEN p_payload->'confirmContact'='true'::jsonb THEN phone ELSE confirmed_phone END,
   contact_confirmed_at=CASE WHEN p_payload->'confirmContact'='true'::jsonb THEN now() ELSE contact_confirmed_at END WHERE id=l.id RETURNING * INTO l;
  RETURN public.member_listing_json(l);
 END IF;
 IF l.contact_confirmed_at IS NULL OR l.confirmed_phone IS DISTINCT FROM phone THEN RAISE EXCEPTION 'listing_phone_confirmation'; END IF;
 RETURN public.member_classifieds_before_seller_experience(p_action,p_payload);
END $$;
REVOKE ALL ON FUNCTION public.member_classifieds(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_classifieds(text,jsonb) TO authenticated,service_role;

-- Stale clients cannot create a new checkout while an unused paid period exists.
ALTER FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) RENAME TO member_billing_purchase_before_seller_experience;
REVOKE ALL ON FUNCTION public.member_billing_purchase_before_seller_experience(uuid,uuid,boolean,boolean) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_billing_purchase(p_actor uuid,p_id uuid,p_contact boolean,p_accepted boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.member_bike_listings; phone text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,9150));
 SELECT * INTO l FROM public.member_bike_listings WHERE id=p_id AND user_id=p_actor AND seller_kind='individual' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 SELECT replace(phone_number,'+','') INTO phone FROM public.member_identity_verifications WHERE user_id=p_actor AND phone_verified_at IS NOT NULL;
 IF l.contact_confirmed_at IS NULL OR phone IS NULL OR l.confirmed_phone IS DISTINCT FROM phone THEN RAISE EXCEPTION 'listing_phone_confirmation'; END IF;
 IF NOT public.member_listing_entitled(l.id) AND jsonb_array_length(public.member_available_periods(p_actor,p_id))>0 THEN RAISE EXCEPTION 'billing_credit_available'; END IF;
 RETURN public.member_billing_purchase_before_seller_experience(p_actor,p_id,p_contact,p_accepted);
END $$;
REVOKE ALL ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) TO service_role;

-- Keep provider reconciliation serialized with reassignment. Payment IDs/observations stay unchanged.
ALTER FUNCTION public.member_billing_recalculate(uuid) RENAME TO member_billing_recalculate_before_seller_experience;
REVOKE ALL ON FUNCTION public.member_billing_recalculate_before_seller_experience(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_billing_recalculate(p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 SELECT user_id INTO actor FROM public.member_listing_billing WHERE id=p_order;
 IF actor IS NULL THEN RETURN; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,9150));
 -- A contact changed during checkout must not strand a paid order or auto-publish a different number.
 UPDATE public.member_listing_billing o SET publish_requested=false
 FROM public.member_bike_listings l LEFT JOIN public.member_identity_verifications v ON v.user_id=l.user_id
 WHERE o.id=p_order AND l.id=o.listing_id AND (l.contact_confirmed_at IS NULL OR v.phone_verified_at IS NULL OR l.confirmed_phone IS DISTINCT FROM replace(v.phone_number,'+',''));
 PERFORM public.member_billing_recalculate_before_seller_experience(p_order);
END $$;
REVOKE ALL ON FUNCTION public.member_billing_recalculate(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_recalculate(uuid) TO service_role;

-- Payment observations take the same lock before the legacy writer acquires row locks.
ALTER FUNCTION public.member_billing_record_payment(uuid,text,text,boolean,date,timestamptz) RENAME TO member_billing_record_payment_before_seller_experience;
REVOKE ALL ON FUNCTION public.member_billing_record_payment_before_seller_experience(uuid,text,text,boolean,date,timestamptz) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_billing_record_payment(p_order uuid,p_payment text,p_status text,p_paid boolean,p_due date,p_observed timestamptz) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid;
BEGIN
 SELECT user_id INTO actor FROM public.member_listing_billing WHERE id=p_order;
 IF actor IS NOT NULL THEN PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,9150)); END IF;
 PERFORM public.member_billing_record_payment_before_seller_experience(p_order,p_payment,p_status,p_paid,p_due,p_observed);
END $$;
REVOKE ALL ON FUNCTION public.member_billing_record_payment(uuid,text,text,boolean,date,timestamptz) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_record_payment(uuid,text,text,boolean,date,timestamptz) TO service_role;

-- Channel Admin shares ordering/message behavior, under its existing server-only role gate.
ALTER FUNCTION public.admin_channel_classifieds(uuid,text,jsonb) RENAME TO admin_channel_classifieds_before_seller_experience;
REVOKE ALL ON FUNCTION public.admin_channel_classifieds_before_seller_experience(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_channel_classifieds(p_actor uuid,p_action text DEFAULT 'list',p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE base jsonb;l public.member_bike_listings;msg text;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_action='reorder' THEN
  SELECT * INTO l FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND seller_kind='channel' FOR UPDATE;
  IF NOT FOUND OR l.status<>'draft' THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
  PERFORM public.member_listing_reorder(l.id,p_payload->'imageIds'); RETURN public.member_listing_json(l);
 END IF;
 base:=public.admin_channel_classifieds_before_seller_experience(p_actor,p_action,p_payload);
 IF p_action='list' THEN RETURN COALESCE((SELECT jsonb_agg(x||jsonb_build_object('metrics',public.member_listing_metrics((x->>'id')::uuid))) FROM jsonb_array_elements(base) x),'[]'::jsonb); END IF;
 IF p_action='save' THEN
  msg:=btrim(COALESCE(p_payload->>'whatsappMessage','')); IF char_length(msg)>600 THEN RAISE EXCEPTION 'listing_invalid'; END IF;
  UPDATE public.member_bike_listings SET whatsapp_message=msg WHERE id=(p_payload->>'id')::uuid RETURNING * INTO l; RETURN public.member_listing_json(l);
 END IF;
 RETURN base;
END $$;
REVOKE ALL ON FUNCTION public.admin_channel_classifieds(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_channel_classifieds(uuid,text,jsonb) TO service_role;
NOTIFY pgrst, 'reload schema';
COMMIT;
