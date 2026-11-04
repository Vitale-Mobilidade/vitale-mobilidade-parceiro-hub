BEGIN;
-- Private designation only; does not grant editorial/global administration.
ALTER TABLE public.member_classifieds_settings ADD COLUMN channel_seller_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
-- Set the designated UUID separately in the authorized activation transaction.

CREATE OR REPLACE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('sellerType',CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=p_listing.user_id) THEN 'channel' ELSE 'individual' END,'id',p_listing.id,'title',p_listing.title,'brand',p_listing.brand,'model',p_listing.model,
 'priceCents',p_listing.price_cents,'city',p_listing.city,'state',p_listing.state,'modelYear',p_listing.model_year,
 'mileageKm',p_listing.mileage_km,'condition',p_listing.condition,'battery',p_listing.battery,'invoice',p_listing.invoice,
 'description',p_listing.description,'maintenance',p_listing.maintenance,'status',p_listing.status,
 'feeCents',p_listing.fee_cents,'feeStatus',p_listing.fee_status,'publishedAt',p_listing.published_at,'updatedAt',p_listing.updated_at,
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
  INSERT INTO public.member_bike_listings(user_id) VALUES(actor) RETURNING * INTO listing;
  RETURN public.member_listing_json(listing);
 END IF;
 IF p_action<>'finalize_avatar' THEN
  SELECT * INTO listing FROM public.member_bike_listings WHERE id=(p_payload->>'id')::uuid AND user_id=actor FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 END IF;
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
REVOKE ALL ON FUNCTION public.member_classifieds(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_classifieds(text,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.member_bike_listings_public(p_id uuid DEFAULT NULL,p_limit integer DEFAULT 12,p_offset integer DEFAULT 0) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH visible AS (
  SELECT l.*,p.display_name,a.object_path avatar_path,v.phone_number FROM public.member_bike_listings l
  JOIN public.member_profiles p ON p.user_id=l.user_id
  JOIN public.member_identity_verifications v ON v.user_id=l.user_id
  LEFT JOIN public.member_media_assets a ON a.id=p.avatar_asset_id AND a.status='ready'
  WHERE l.status='published' AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id)
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
COMMIT;
