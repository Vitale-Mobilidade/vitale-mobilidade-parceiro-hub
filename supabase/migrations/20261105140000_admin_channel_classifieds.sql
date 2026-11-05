BEGIN;
ALTER TABLE public.member_bike_listings
 ADD COLUMN seller_kind text NOT NULL DEFAULT 'individual' CHECK(seller_kind IN ('individual','channel')),
 ADD COLUMN channel_whatsapp text CHECK(channel_whatsapp IS NULL OR channel_whatsapp ~ '^55[1-9][0-9]9[0-9]{8}$'),
 ADD COLUMN channel_expires_at timestamptz;
-- Channel is institutional inventory, never inferred from a member email or test account.
CREATE FUNCTION public.member_listing_visible(p_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=p_id AND
 CASE WHEN l.seller_kind='channel' THEN (SELECT enabled FROM public.member_classifieds_settings WHERE singleton)
 AND l.channel_whatsapp IS NOT NULL AND l.channel_expires_at>now()
 ELSE public.member_classifieds_visible(l.user_id) END);
$$;
REVOKE ALL ON FUNCTION public.member_listing_visible(uuid) FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.member_listing_entitled(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=p_id AND l.seller_kind='channel') OR EXISTS(SELECT 1 FROM public.member_listing_billing o WHERE o.listing_id=p_id AND o.billing_model='one_time_90d' AND o.status='active' AND NOT o.hold AND o.paid_at IS NOT NULL AND (o.paid_until IS NULL OR o.paid_until>now()) AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=o.id AND c.paid));
$$;

CREATE OR REPLACE FUNCTION public.member_billing_start_display() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE o public.member_listing_billing;
BEGIN
 IF NEW.seller_kind='channel' THEN
  IF NEW.status='published' AND OLD.status<>'published' AND (NEW.channel_expires_at IS NULL OR NEW.channel_expires_at<=now()) THEN NEW.channel_expires_at:=now()+interval '2160 hours'; END IF;
  RETURN NEW;
 END IF;
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
CREATE OR REPLACE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('sellerType',CASE WHEN p_listing.seller_kind='channel' THEN 'channel' ELSE 'individual' END,'id',p_listing.id,'title',p_listing.title,'brand',p_listing.brand,'model',p_listing.model,
 'priceCents',p_listing.price_cents,'city',p_listing.city,'state',p_listing.state,'modelYear',p_listing.model_year,
 'mileageKm',p_listing.mileage_km,'condition',p_listing.condition,'battery',p_listing.battery,'invoice',p_listing.invoice,
 'description',p_listing.description,'maintenance',p_listing.maintenance,'status',p_listing.status,
 'feeCents',p_listing.fee_cents,'channelWhatsapp',p_listing.channel_whatsapp,'feeStatus',CASE WHEN p_listing.seller_kind='channel' THEN 'required' WHEN public.member_listing_entitled(p_listing.id) THEN 'paid' ELSE 'required' END,'displayExpiresAt',CASE WHEN p_listing.seller_kind='channel' THEN p_listing.channel_expires_at ELSE (SELECT o.paid_until FROM public.member_listing_billing o WHERE o.listing_id=p_listing.id AND o.billing_model='one_time_90d' ORDER BY o.created_at DESC LIMIT 1) END,'publishedAt',p_listing.published_at,'updatedAt',p_listing.updated_at,
 'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status',a.status) ORDER BY a.position,a.created_at)
 FROM public.member_media_assets a WHERE a.listing_id=p_listing.id AND a.status<>'removed'),'[]'::jsonb));
$$;

DO $patch$ DECLARE d text; BEGIN
 d:=pg_get_functiondef('public.member_classifieds(text,jsonb)'::regprocedure);
 IF position('WHERE l.user_id=actor' IN d)=0 OR position('AND user_id=actor FOR UPDATE' IN d)=0 THEN RAISE EXCEPTION 'member_contract_changed'; END IF;
 d:=replace(d,'WHERE l.user_id=actor','WHERE l.user_id=actor AND l.seller_kind=''individual''');
 d:=replace(d,'AND user_id=actor FOR UPDATE','AND user_id=actor AND seller_kind=''individual'' FOR UPDATE');
 d:=replace(d,'CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=actor) THEN ''channel'' ELSE ''individual'' END','''individual''');
 EXECUTE d;
END $patch$;
CREATE OR REPLACE FUNCTION public.member_bike_listings_public(p_id uuid DEFAULT NULL,p_limit integer DEFAULT 12,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH visible AS (
  SELECT l.*,p.display_name,a.object_path avatar_path,v.phone_number FROM public.member_bike_listings l
  LEFT JOIN public.member_profiles p ON p.user_id=l.user_id
  LEFT JOIN public.member_identity_verifications v ON v.user_id=l.user_id
  LEFT JOIN public.member_media_assets a ON a.id=p.avatar_asset_id AND a.status='ready'
  WHERE l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_listing_visible(l.id)
   AND (p_id IS NULL OR l.id=p_id)
 ), items AS (
  SELECT * FROM visible ORDER BY published_at DESC,id LIMIT greatest(1,least(COALESCE(p_limit,12),100)) OFFSET greatest(0,least(COALESCE(p_offset,0),10000))
 )
 SELECT jsonb_build_object('total',(SELECT count(*) FROM visible),'items',COALESCE((SELECT jsonb_agg(
  (public.member_listing_json(l)-'images') || jsonb_build_object('sellerName',CASE WHEN i.seller_kind='channel' THEN 'Vitale Mobilidade' ELSE i.display_name END,'avatarPath',CASE WHEN i.seller_kind='channel' THEN NULL ELSE i.avatar_path END,
   'whatsapp',CASE WHEN i.seller_kind='channel' THEN i.channel_whatsapp ELSE replace(i.phone_number,'+','') END,
   'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status','ready') ORDER BY a.position,a.created_at) FROM public.member_media_assets a WHERE a.listing_id=i.id AND a.status='ready'),'[]'::jsonb))
  ORDER BY i.published_at DESC,i.id) FROM items i JOIN public.member_bike_listings l ON l.id=i.id),'[]'::jsonb));
$$;

CREATE OR REPLACE FUNCTION public.member_bike_image_public(p_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.object_path FROM public.member_media_assets a WHERE a.id=p_id AND a.status='ready' AND (
  EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_listing_visible(l.id))
  OR (a.kind='avatar' AND EXISTS(SELECT 1 FROM public.member_profiles p JOIN public.member_bike_listings l ON l.user_id=p.user_id WHERE p.avatar_asset_id=a.id AND l.status='published' AND public.member_listing_entitled(l.id) AND l.contact_consent_at IS NOT NULL AND public.member_listing_visible(l.id)))
 );
$$;

CREATE OR REPLACE FUNCTION public.member_media_access(p_path text,p_operation text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT (p_operation='select' AND EXISTS(SELECT 1 FROM public.member_media_assets a JOIN public.member_bike_listings l ON l.id=a.listing_id WHERE a.object_path=p_path AND a.status='ready' AND l.seller_kind='channel' AND l.status='published' AND l.contact_consent_at IS NOT NULL AND public.member_listing_visible(l.id))) OR EXISTS(SELECT 1 FROM public.member_media_assets a
 JOIN public.member_profiles p ON p.user_id=a.user_id
 WHERE a.object_path=p_path AND (a.kind='avatar' OR EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.seller_kind='individual')) AND NOT p.suspended AND p.community_joined_at IS NOT NULL
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

CREATE FUNCTION public.admin_channel_classifieds(p_actor uuid,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.member_bike_listings; a public.member_media_assets; pos integer; new_asset_id uuid;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>12000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 IF p_action='list' THEN
  UPDATE public.member_bike_listings SET status='draft',contact_consent_at=NULL,updated_at=now() WHERE seller_kind='channel' AND status='published' AND channel_expires_at<=now();
  RETURN COALESCE((SELECT jsonb_agg(public.member_listing_json(t) ORDER BY t.created_at DESC) FROM (SELECT * FROM public.member_bike_listings WHERE seller_kind='channel' ORDER BY created_at DESC LIMIT 200) t),'[]'::jsonb); END IF;
 IF p_action='create' THEN
  SELECT * INTO l FROM public.member_bike_listings WHERE seller_kind='channel' AND user_id=p_actor AND status='draft' AND title='Minha bike' AND brand='' AND description='' AND NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=member_bike_listings.id AND status<>'removed') ORDER BY created_at DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN RETURN public.member_listing_json(l); END IF;
  IF (SELECT count(*) FROM public.member_bike_listings WHERE seller_kind='channel' AND user_id=p_actor AND created_at>now()-interval '24 hours')>=20 THEN RAISE EXCEPTION 'listing_limit'; END IF;
  INSERT INTO public.member_bike_listings(user_id,seller_kind,fee_status) VALUES(p_actor,'channel','required') RETURNING * INTO l;
  RETURN public.member_listing_json(l);
 END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND seller_kind='channel' FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 IF p_action='get' THEN RETURN public.member_listing_json(l); END IF;
 IF p_action IN ('withdraw','archive','sold') THEN
  UPDATE public.member_bike_listings SET status=CASE p_action WHEN 'withdraw' THEN 'draft' WHEN 'archive' THEN 'archived' ELSE 'sold' END,contact_consent_at=NULL,updated_at=now() WHERE member_bike_listings.id=l.id RETURNING * INTO l;
  RETURN public.member_listing_json(l);
 END IF;
 IF l.status<>'draft' THEN RAISE EXCEPTION 'listing_not_draft'; END IF;
 IF p_action='save' THEN
  IF char_length(COALESCE(p_payload->>'title',''))>100 OR char_length(COALESCE(p_payload->>'brand',''))>60 OR char_length(COALESCE(p_payload->>'model',''))>80 OR char_length(COALESCE(p_payload->>'city',''))>80 OR char_length(COALESCE(p_payload->>'description',''))>4000 OR char_length(COALESCE(p_payload->>'maintenance',''))>1000 THEN RAISE EXCEPTION 'listing_invalid'; END IF;
  UPDATE public.member_bike_listings SET title=COALESCE(NULLIF(btrim(p_payload->>'title'),''),'Minha bike'),brand=btrim(COALESCE(p_payload->>'brand','')),model=btrim(COALESCE(p_payload->>'model','')),price_cents=COALESCE((p_payload->>'priceCents')::integer,0),city=btrim(COALESCE(p_payload->>'city','')),state=COALESCE(p_payload->>'state',''),model_year=(p_payload->>'modelYear')::integer,mileage_km=(p_payload->>'mileageKm')::integer,condition=p_payload->>'condition',battery=p_payload->>'battery',invoice=(p_payload->>'invoice')::boolean,description=btrim(COALESCE(p_payload->>'description','')),maintenance=btrim(COALESCE(p_payload->>'maintenance','')),updated_at=now() WHERE member_bike_listings.id=l.id RETURNING * INTO l;
 ELSIF p_action='publish' THEN
  IF p_payload->>'contactConsent' IS DISTINCT FROM 'true' THEN RAISE EXCEPTION 'listing_contact_consent'; END IF;
  IF COALESCE(p_payload->>'whatsapp','') !~ '^55[1-9][0-9]9[0-9]{8}$' THEN RAISE EXCEPTION 'listing_contact_invalid'; END IF;
  IF l.title='Minha bike' OR char_length(l.title)<6 OR l.brand='' OR l.model='' OR l.price_cents<100 OR l.city='' OR l.state='' OR l.mileage_km IS NULL OR char_length(l.description)<20 OR NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='ready') OR EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='reserved') THEN RAISE EXCEPTION 'listing_incomplete'; END IF;
  UPDATE public.member_bike_listings SET status='published',channel_whatsapp=p_payload->>'whatsapp',contact_consent_at=now(),published_at=COALESCE(published_at,now()),updated_at=now() WHERE member_bike_listings.id=l.id RETURNING * INTO l;
 ELSIF p_action='reserve_image' THEN
  IF (SELECT count(*) FROM public.member_media_assets WHERE listing_id=l.id AND status<>'removed')>=5 THEN RAISE EXCEPTION 'listing_image_limit'; END IF;
  IF (SELECT count(*) FROM public.member_media_assets WHERE user_id=l.user_id AND created_at>now()-interval '24 hours')>=100 THEN RAISE EXCEPTION 'media_rate_limited'; END IF;
  SELECT n INTO pos FROM generate_series(0,4) n WHERE NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status<>'removed' AND position=n) ORDER BY n LIMIT 1;
  new_asset_id:=gen_random_uuid();
  INSERT INTO public.member_media_assets(id,user_id,listing_id,kind,object_path,position) VALUES(new_asset_id,l.user_id,l.id,'listing',l.user_id::text||'/listings/'||l.id::text||'/'||new_asset_id::text||'.webp',pos) RETURNING * INTO a;
  RETURN jsonb_build_object('id',a.id,'path',a.object_path);
 ELSIF p_action IN ('finalize_image','remove_image','cover') THEN
  SELECT * INTO a FROM public.member_media_assets WHERE member_media_assets.id=(p_payload->>'assetId')::uuid AND listing_id=l.id AND status<>'removed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
  IF p_action='remove_image' THEN UPDATE public.member_media_assets SET status='removed' WHERE member_media_assets.id=a.id;
  ELSIF p_action='cover' THEN
   IF a.status<>'ready' THEN RAISE EXCEPTION 'media_not_ready'; END IF;
   UPDATE public.member_media_assets SET position=a.position WHERE listing_id=l.id AND position=0 AND member_media_assets.id<>a.id AND status<>'removed';
   UPDATE public.member_media_assets SET position=0 WHERE member_media_assets.id=a.id;
  ELSE
   IF a.status<>'reserved' OR a.created_at<now()-interval '15 minutes' OR NOT EXISTS(SELECT 1 FROM storage.objects WHERE bucket_id='member-media' AND name=a.object_path AND (metadata->>'size')::bigint BETWEEN 1 AND 2097152 AND metadata->>'mimetype'='image/webp') THEN RAISE EXCEPTION 'media_not_ready'; END IF;
   UPDATE public.member_media_assets SET status='ready' WHERE member_media_assets.id=a.id;
  END IF;
 ELSE RAISE EXCEPTION 'invalid_input'; END IF;
 RETURN public.member_listing_json(l);
END $$;
REVOKE ALL ON FUNCTION public.admin_channel_classifieds(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_channel_classifieds(uuid,text,jsonb) TO service_role;

CREATE FUNCTION public.admin_member_metrics(p_actor uuid,p_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE first_day date; last_day date :=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 90 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 first_day:=last_day-(p_days-1);
 RETURN jsonb_build_object('generatedAt',now(),'days',p_days,
 'members',(SELECT count(*) FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false)),
 'listings',(SELECT count(*) FROM public.member_bike_listings),
 'channelListings',(SELECT count(*) FROM public.member_bike_listings WHERE seller_kind='channel'),
 'activeListings',(SELECT count(*) FROM public.member_bike_listings WHERE status='published' AND public.member_listing_visible(id) AND public.member_listing_entitled(id)),
 'grossCents',(SELECT COALESCE(sum(amount_cents),0) FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN first_day AND last_day),
 'reversedPayments',(SELECT count(*) FROM public.member_listing_billing b WHERE b.paid_at IS NOT NULL AND b.billing_model='one_time_90d' AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=b.id AND (c.status LIKE 'REFUND%' OR c.status LIKE 'CHARGEBACK%'))),
 'daily',(SELECT jsonb_agg(jsonb_build_object('day',d::date,'members',(SELECT count(*) FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false) AND (p.community_joined_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date),'listings',(SELECT count(*) FROM public.member_bike_listings WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date),'payments',(SELECT count(*) FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date),'grossCents',(SELECT COALESCE(sum(amount_cents),0) FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date)) ORDER BY d DESC) FROM generate_series(first_day::timestamp,last_day::timestamp,interval '1 day') d));
END $$;
REVOKE ALL ON FUNCTION public.admin_member_metrics(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_member_metrics(uuid,integer) TO service_role;
COMMIT;
