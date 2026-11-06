BEGIN;
CREATE TABLE public.member_listing_courtesies (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES public.member_profiles(user_id),
 listing_id uuid REFERENCES public.member_bike_listings(id),
 request_id uuid NOT NULL,
 unit integer NOT NULL CHECK(unit BETWEEN 1 AND 10),
 reason text NOT NULL CHECK(char_length(btrim(reason)) BETWEEN 5 AND 300),
 granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 granted_at timestamptz NOT NULL DEFAULT now(),
 started_at timestamptz,
 expires_at timestamptz,
 revoked_at timestamptz,
 revoked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 revoke_reason text CHECK(revoke_reason IS NULL OR char_length(btrim(revoke_reason)) BETWEEN 5 AND 300),
 UNIQUE(request_id,unit),
 CHECK((started_at IS NULL AND expires_at IS NULL) OR (started_at IS NOT NULL AND expires_at=started_at+interval '2160 hours'))
);
CREATE INDEX member_courtesies_owner ON public.member_listing_courtesies(user_id);
CREATE UNIQUE INDEX member_courtesies_listing ON public.member_listing_courtesies(listing_id) WHERE listing_id IS NOT NULL AND revoked_at IS NULL;
CREATE TABLE public.member_courtesy_audit (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 courtesy_id uuid NOT NULL REFERENCES public.member_listing_courtesies(id),
 actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 action text NOT NULL CHECK(action IN ('grant','claim','revoke')),
 from_listing_id uuid REFERENCES public.member_bike_listings(id),
 to_listing_id uuid REFERENCES public.member_bike_listings(id),
 reason text,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.member_listing_courtesies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_courtesy_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_listing_courtesies,public.member_courtesy_audit FROM PUBLIC,anon,authenticated;
REVOKE ALL ON SEQUENCE public.member_courtesy_audit_id_seq FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_listing_courtesies,public.member_courtesy_audit TO service_role;
CREATE FUNCTION public.member_courtesy_entitled(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_listing_courtesies c JOIN public.member_bike_listings l ON l.id=c.listing_id AND l.user_id=c.user_id AND l.seller_kind='individual' WHERE c.listing_id=p_id AND c.revoked_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now()));
$$;
REVOKE ALL ON FUNCTION public.member_courtesy_entitled(uuid) FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.member_listing_entitled(uuid) RENAME TO member_listing_entitled_before_courtesies;
REVOKE ALL ON FUNCTION public.member_listing_entitled_before_courtesies(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.member_listing_entitled(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.member_listing_entitled_before_courtesies(p_id) OR public.member_courtesy_entitled(p_id);
$$;
REVOKE ALL ON FUNCTION public.member_listing_entitled(uuid) FROM PUBLIC,anon,authenticated;
-- Trigger dispatch keeps existing paid/channel behavior and never fabricates a payment.
ALTER FUNCTION public.member_billing_start_display() RENAME TO member_billing_start_display_before_courtesies;
CREATE FUNCTION public.member_billing_start_display() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing;
BEGIN
 IF NEW.seller_kind='individual' AND NEW.status='published' AND OLD.status<>'published' AND public.member_courtesy_entitled(NEW.id) THEN
  UPDATE public.member_listing_courtesies SET started_at=now(),expires_at=now()+interval '2160 hours' WHERE listing_id=NEW.id AND revoked_at IS NULL AND started_at IS NULL;
  RETURN NEW;
 END IF;
 -- The old trigger function cannot be called directly; preserve its exact paid/channel body below.
 IF NEW.seller_kind='channel' THEN
  IF NEW.status='published' AND OLD.status<>'published' AND (NEW.channel_expires_at IS NULL OR NEW.channel_expires_at<=now()) THEN NEW.channel_expires_at:=now()+interval '2160 hours'; END IF;
  RETURN NEW;
 END IF;
 IF NEW.status='published' AND OLD.status<>'published' THEN
  SELECT * INTO o FROM public.member_listing_billing WHERE listing_id=NEW.id AND billing_model='one_time_90d' AND status='active' FOR UPDATE;
  IF NOT FOUND OR NOT public.member_listing_entitled_before_courtesies(NEW.id) THEN RAISE EXCEPTION 'billing_required'; END IF;
  IF o.display_started_at IS NULL THEN
   UPDATE public.member_listing_billing SET display_started_at=now(),paid_until=now()+interval '2160 hours',publish_requested=false,updated_at=now() WHERE id=o.id;
  ELSE
   UPDATE public.member_listing_billing SET publish_requested=false WHERE id=o.id;
  END IF;
 END IF;
 RETURN NEW;
END $$;
-- Existing trigger still points at renamed function OID: recreate to dispatch through the new wrapper.
DO $$ DECLARE t record;BEGIN
 FOR t IN SELECT tgname FROM pg_trigger WHERE tgrelid='public.member_bike_listings'::regclass AND tgfoid='public.member_billing_start_display_before_courtesies()'::regprocedure AND NOT tgisinternal LOOP
  EXECUTE format('DROP TRIGGER %I ON public.member_bike_listings',t.tgname);
  EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE OF status ON public.member_bike_listings FOR EACH ROW EXECUTE FUNCTION public.member_billing_start_display()',t.tgname);
 END LOOP;
END $$;
REVOKE ALL ON FUNCTION public.member_billing_start_display(),public.member_billing_start_display_before_courtesies() FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.member_listing_json(public.member_bike_listings) RENAME TO member_listing_json_before_courtesies;
CREATE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.member_listing_json_before_courtesies(p_listing)|| CASE WHEN public.member_courtesy_entitled(p_listing.id) THEN jsonb_build_object('feeStatus','courtesy','displayExpiresAt',(SELECT expires_at FROM public.member_listing_courtesies WHERE listing_id=p_listing.id AND revoked_at IS NULL)) ELSE '{}'::jsonb END;
$$;
REVOKE ALL ON FUNCTION public.member_listing_json(public.member_bike_listings),public.member_listing_json_before_courtesies(public.member_bike_listings) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.member_courtesy_periods(p_actor uuid,p_target uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE(jsonb_agg(jsonb_build_object('id',c.id,'kind','courtesy','listingTitle',COALESCE(l.title,'Cortesia de parceiro'),'paidUntil',c.expires_at) ORDER BY c.granted_at),'[]'::jsonb)
 FROM public.member_listing_courtesies c LEFT JOIN public.member_bike_listings l ON l.id=c.listing_id
 WHERE c.user_id=p_actor AND c.revoked_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now()) AND (c.listing_id IS NULL OR l.status<>'published');
$$;
REVOKE ALL ON FUNCTION public.member_courtesy_periods(uuid,uuid) FROM PUBLIC,anon,authenticated;
ALTER FUNCTION public.member_classifieds(text,jsonb) RENAME TO member_classifieds_before_courtesies;
REVOKE ALL ON FUNCTION public.member_classifieds_before_courtesies(text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_classifieds(p_action text DEFAULT 'account',p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid();base jsonb;l public.member_bike_listings;c public.member_listing_courtesies;
BEGIN
 IF actor IS NULL THEN RAISE EXCEPTION 'forbidden'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(actor::text,9150));
 base:=public.member_classifieds_before_courtesies('account','{}');
 IF p_action NOT IN ('periods','claim_period') THEN RETURN public.member_classifieds_before_courtesies(p_action,p_payload); END IF;
 -- Existing RPC validates membership, suspension, payload and ownership before returning periods.
 base:=public.member_classifieds_before_courtesies('periods',p_payload);
 IF p_action='periods' THEN RETURN base||public.member_courtesy_periods(actor,(p_payload->>'id')::uuid); END IF;
 SELECT * INTO c FROM public.member_listing_courtesies WHERE id=(p_payload->>'orderId')::uuid AND user_id=actor FOR UPDATE;
 IF NOT FOUND THEN RETURN public.member_classifieds_before_courtesies(p_action,p_payload); END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND user_id=actor AND seller_kind='individual' FOR UPDATE;
 IF NOT FOUND OR l.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
 IF c.revoked_at IS NOT NULL OR c.expires_at<=now() THEN RAISE EXCEPTION 'courtesy_unavailable'; END IF;
 IF c.listing_id=l.id THEN RETURN public.member_listing_json(l); END IF;
 IF EXISTS(SELECT 1 FROM public.member_bike_listings WHERE id=c.listing_id AND status='published') THEN RAISE EXCEPTION 'period_in_use'; END IF;
 IF public.member_listing_entitled(l.id) THEN RAISE EXCEPTION 'period_already_assigned'; END IF;
 IF EXISTS(SELECT 1 FROM public.member_listing_billing WHERE listing_id=l.id AND status NOT IN ('cancelled','failed','expired')) THEN RAISE EXCEPTION 'billing_pending'; END IF;
 -- A finished old courtesy can be detached; its immutable audit and dates remain.
 UPDATE public.member_listing_courtesies SET listing_id=NULL WHERE listing_id=l.id AND revoked_at IS NULL AND expires_at<=now();
 INSERT INTO public.member_courtesy_audit(courtesy_id,actor_id,action,from_listing_id,to_listing_id) VALUES(c.id,actor,'claim',c.listing_id,l.id);
 UPDATE public.member_listing_courtesies SET listing_id=l.id WHERE id=c.id;
 RETURN public.member_listing_json(l);
END $$;
REVOKE ALL ON FUNCTION public.member_classifieds(text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.member_classifieds(text,jsonb) TO authenticated,service_role;
ALTER FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) RENAME TO member_billing_purchase_before_courtesies;
REVOKE ALL ON FUNCTION public.member_billing_purchase_before_courtesies(uuid,uuid,boolean,boolean) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_billing_purchase(p_actor uuid,p_id uuid,p_contact boolean,p_accepted boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,9150));
 IF jsonb_array_length(public.member_courtesy_periods(p_actor,p_id))>0 OR public.member_courtesy_entitled(p_id) THEN RAISE EXCEPTION 'courtesy_available'; END IF;
 RETURN public.member_billing_purchase_before_courtesies(p_actor,p_id,p_contact,p_accepted);
END $$;
REVOKE ALL ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) TO service_role;
-- A paid slot cannot be moved onto a bike already covered by a courtesy.
ALTER FUNCTION public.member_claim_period(uuid,uuid,uuid) RENAME TO member_claim_period_before_courtesies;
REVOKE ALL ON FUNCTION public.member_claim_period_before_courtesies(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.member_claim_period(p_actor uuid,p_target uuid,p_order uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(p_actor::text,9150));
 IF public.member_courtesy_entitled(p_target) THEN RAISE EXCEPTION 'period_already_assigned'; END IF;
 PERFORM public.member_claim_period_before_courtesies(p_actor,p_target,p_order);
END $$;
REVOKE ALL ON FUNCTION public.member_claim_period(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
-- Reuse the minute worker for expiry; public access also checks expiry immediately.
ALTER FUNCTION public.member_billing_expire_periods() RENAME TO member_billing_expire_periods_before_courtesies;
CREATE FUNCTION public.member_billing_expire_periods() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 PERFORM public.member_billing_expire_periods_before_courtesies();
 UPDATE public.member_bike_listings l SET status='draft',contact_consent_at=NULL,updated_at=now() FROM public.member_listing_courtesies c
 WHERE c.listing_id=l.id AND l.status='published' AND (c.revoked_at IS NOT NULL OR c.expires_at<=now()) AND NOT public.member_listing_entitled(l.id);
END $$;
REVOKE ALL ON FUNCTION public.member_billing_expire_periods(),public.member_billing_expire_periods_before_courtesies() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_expire_periods() TO service_role;

-- Private administrative projections. No direct table grants to browser roles.
CREATE FUNCTION public.admin_member_summary(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',p.user_id,'name',p.display_name,'email',u.email,'phone',COALESCE(v.phone_number,(SELECT destination FROM public.member_identity_challenges WHERE user_id=p.user_id AND channel='phone'),u.raw_user_meta_data->>'phone'),'joinedAt',p.community_joined_at,'suspended',p.suspended,
 'emailVerified',COALESCE(v.email_address=lower(btrim(u.email)) AND v.email_verified_at IS NOT NULL AND v.email_verified_at>=COALESCE(u.email_confirmed_at,u.created_at),false),
 'phoneVerified',v.phone_number IS NOT NULL AND v.phone_verified_at IS NOT NULL,
 'listings',(SELECT count(*) FROM public.member_bike_listings WHERE user_id=p.user_id AND seller_kind='individual'),
 'activeListings',(SELECT count(*) FROM public.member_bike_listings WHERE user_id=p.user_id AND seller_kind='individual' AND status='published' AND public.member_listing_visible(id) AND public.member_listing_entitled(id)),
 'availableCourtesies',(SELECT count(*) FROM public.member_listing_courtesies c LEFT JOIN public.member_bike_listings l ON l.id=c.listing_id WHERE c.user_id=p.user_id AND c.revoked_at IS NULL AND (c.expires_at IS NULL OR c.expires_at>now()) AND (l.id IS NULL OR l.status<>'published')))
 FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id LEFT JOIN public.member_identity_verifications v ON v.user_id=p.user_id WHERE p.user_id=p_id AND p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false);
$$;
CREATE FUNCTION public.admin_listing_summary(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.member_listing_json(l)||jsonb_build_object('owner',public.admin_member_summary(l.user_id),'metrics',public.member_listing_metrics(l.id),'createdAt',l.created_at,'entitled',public.member_listing_entitled(l.id))
 FROM public.member_bike_listings l WHERE l.id=p_id;
$$;
REVOKE ALL ON FUNCTION public.admin_member_summary(uuid),public.admin_listing_summary(uuid) FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.admin_community_manage(p_actor uuid,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q text;digits text;off integer;total bigint;items jsonb;target uuid;c public.member_listing_courtesies;request uuid;quantity integer;v_reason text;prior_count integer;
BEGIN
 IF p_actor IS NULL OR NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>2048 OR p_action IS NULL OR p_action NOT IN ('members','listings','member','grant','revoke') THEN RAISE EXCEPTION 'invalid_input'; END IF;
 IF p_action IN ('members','listings') THEN
  q:=lower(btrim(COALESCE(p_payload->>'query','')));digits:=regexp_replace(q,'[^0-9]','','g');off:=COALESCE((p_payload->>'offset')::integer,0);
  IF char_length(q)>120 OR off NOT BETWEEN 0 AND 100000 OR (p_action='listings' AND COALESCE(p_payload->>'status','all') NOT IN ('all','draft','published','sold','archived')) THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF p_action='members' THEN
   WITH matching AS (SELECT p.user_id,p.community_joined_at FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id LEFT JOIN public.member_identity_verifications v ON v.user_id=p.user_id WHERE p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false) AND (q='' OR strpos(lower(p.display_name),q)>0 OR strpos(lower(COALESCE(u.email,'')),q)>0 OR (digits<>'' AND strpos(regexp_replace(COALESCE(v.phone_number,(SELECT destination FROM public.member_identity_challenges WHERE user_id=p.user_id AND channel='phone'),u.raw_user_meta_data->>'phone',''),'[^0-9]','','g'),digits)>0)))
   SELECT (SELECT count(*) FROM matching),COALESCE((SELECT jsonb_agg(public.admin_member_summary(x.user_id) ORDER BY x.community_joined_at DESC,x.user_id) FROM (SELECT * FROM matching ORDER BY community_joined_at DESC,user_id LIMIT 20 OFFSET off)x),'[]'::jsonb) INTO total,items;
  ELSE
   WITH matching AS (SELECT l.id,l.created_at FROM public.member_bike_listings l LEFT JOIN public.member_profiles p ON p.user_id=l.user_id LEFT JOIN auth.users u ON u.id=l.user_id LEFT JOIN public.member_identity_verifications v ON v.user_id=l.user_id WHERE (COALESCE(p_payload->>'status','all')='all' OR l.status=p_payload->>'status') AND (q='' OR strpos(lower(l.title||' '||l.brand||' '||l.model||' '||COALESCE(p.display_name,'')||' '||COALESCE(u.email,'')),q)>0 OR (digits<>'' AND strpos(regexp_replace(COALESCE(v.phone_number,l.channel_whatsapp,(SELECT destination FROM public.member_identity_challenges WHERE user_id=l.user_id AND channel='phone'),u.raw_user_meta_data->>'phone',''),'[^0-9]','','g'),digits)>0)))
   SELECT (SELECT count(*) FROM matching),COALESCE((SELECT jsonb_agg(public.admin_listing_summary(x.id) ORDER BY x.created_at DESC,x.id) FROM (SELECT * FROM matching ORDER BY created_at DESC,id LIMIT 20 OFFSET off)x),'[]'::jsonb) INTO total,items;
  END IF;
  RETURN jsonb_build_object('total',total,'items',items,'offset',off);
 END IF;
 IF p_action='member' THEN
  target:=(p_payload->>'id')::uuid;
 ELSE
  target:=(p_payload->>'userId')::uuid;
 END IF;
 IF public.admin_member_summary(target) IS NULL THEN RAISE EXCEPTION 'member_unavailable'; END IF;
 IF p_action IN ('grant','revoke') THEN
  PERFORM pg_advisory_xact_lock(hashtextextended(target::text,9150));
  v_reason:=btrim(COALESCE(p_payload->>'reason',''));
  IF char_length(v_reason) NOT BETWEEN 5 AND 300 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF p_action='grant' THEN
   request:=(p_payload->>'requestId')::uuid;quantity:=(p_payload->>'quantity')::integer;
   IF request IS NULL OR quantity IS NULL OR quantity NOT BETWEEN 1 AND 10 OR EXISTS(SELECT 1 FROM public.member_profiles WHERE user_id=target AND suspended) THEN RAISE EXCEPTION 'invalid_input'; END IF;
   SELECT count(*) INTO prior_count FROM public.member_listing_courtesies WHERE request_id=request;
   IF prior_count>0 AND (prior_count<>quantity OR EXISTS(SELECT 1 FROM public.member_listing_courtesies WHERE request_id=request AND (user_id<>target OR granted_by IS DISTINCT FROM p_actor OR reason IS DISTINCT FROM v_reason))) THEN RAISE EXCEPTION 'request_conflict'; END IF;
   IF prior_count=0 THEN
    IF (SELECT count(*) FROM public.member_listing_courtesies WHERE user_id=target AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now()))+quantity>50 THEN RAISE EXCEPTION 'courtesy_limit'; END IF;
    INSERT INTO public.member_listing_courtesies(user_id,request_id,unit,reason,granted_by) SELECT target,request,n,v_reason,p_actor FROM generate_series(1,quantity)n;
    INSERT INTO public.member_courtesy_audit(courtesy_id,actor_id,action,reason) SELECT id,p_actor,'grant',v_reason FROM public.member_listing_courtesies WHERE request_id=request;
   END IF;
  ELSE
   SELECT * INTO c FROM public.member_listing_courtesies WHERE id=(p_payload->>'courtesyId')::uuid AND user_id=target FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'courtesy_unavailable'; END IF;
   IF c.revoked_at IS NULL THEN
    UPDATE public.member_listing_courtesies SET revoked_at=now(),revoked_by=p_actor,revoke_reason=v_reason WHERE id=c.id;
    INSERT INTO public.member_courtesy_audit(courtesy_id,actor_id,action,from_listing_id,reason) VALUES(c.id,p_actor,'revoke',c.listing_id,v_reason);
    UPDATE public.member_bike_listings SET status='draft',contact_consent_at=NULL,updated_at=now() WHERE id=c.listing_id AND status='published' AND NOT public.member_listing_entitled(id);
   END IF;
  END IF;
 END IF;
 RETURN jsonb_build_object('member',public.admin_member_summary(target),
 'listings',COALESCE((SELECT jsonb_agg(public.admin_listing_summary(l.id) ORDER BY l.created_at DESC) FROM public.member_bike_listings l WHERE l.user_id=target AND l.seller_kind='individual'),'[]'::jsonb),
 'courtesies',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',cc.id,'listingId',cc.listing_id,'reason',cc.reason,'grantedAt',cc.granted_at,'grantedBy',u.email,'startedAt',cc.started_at,'expiresAt',cc.expires_at,'revokedAt',cc.revoked_at,'revokeReason',cc.revoke_reason) ORDER BY cc.granted_at DESC) FROM public.member_listing_courtesies cc LEFT JOIN auth.users u ON u.id=cc.granted_by WHERE cc.user_id=target),'[]'::jsonb));
END $$;
REVOKE ALL ON FUNCTION public.admin_community_manage(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_community_manage(uuid,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
