BEGIN;

CREATE TABLE public.member_classifieds_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 enabled boolean NOT NULL DEFAULT false,
 pilot_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
 listing_fee_cents integer NOT NULL DEFAULT 15000 CHECK(listing_fee_cents=15000)
);
INSERT INTO public.member_classifieds_settings(singleton) VALUES(true);

CREATE TABLE public.member_bike_listings (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 bike_id text REFERENCES public.bikes(bike_id) ON DELETE SET NULL,
 title text NOT NULL DEFAULT 'Minha bike' CHECK(char_length(title) BETWEEN 2 AND 100),
 brand text NOT NULL DEFAULT '' CHECK(char_length(brand)<=60),
 model text NOT NULL DEFAULT '' CHECK(char_length(model)<=80),
 price_cents integer NOT NULL DEFAULT 0 CHECK(price_cents BETWEEN 0 AND 100000000),
 city text NOT NULL DEFAULT '' CHECK(char_length(city)<=80),
 state text NOT NULL DEFAULT '' CHECK(state='' OR state IN ('AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO')),
 model_year integer CHECK(model_year BETWEEN 1980 AND 2100),
 mileage_km integer CHECK(mileage_km BETWEEN 0 AND 1000000),
 condition text NOT NULL DEFAULT 'good' CHECK(condition IN ('new','excellent','good','needs_repair')),
 battery text NOT NULL DEFAULT 'unknown' CHECK(battery IN ('original','replaced','unknown','not_applicable')),
 invoice boolean NOT NULL DEFAULT false,
 description text NOT NULL DEFAULT '' CHECK(char_length(description)<=4000),
 maintenance text NOT NULL DEFAULT '' CHECK(char_length(maintenance)<=1000),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','published','sold','archived')),
 fee_cents integer NOT NULL DEFAULT 15000 CHECK(fee_cents=15000),
 fee_status text NOT NULL DEFAULT 'pilot_exempt' CHECK(fee_status='pilot_exempt'),
 contact_consent_at timestamptz,
 published_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX member_bike_listings_public_idx ON public.member_bike_listings(published_at DESC,id) WHERE status='published';
CREATE INDEX member_bike_listings_owner_idx ON public.member_bike_listings(user_id,created_at DESC);

CREATE TABLE public.member_media_assets (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 listing_id uuid REFERENCES public.member_bike_listings(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('avatar','listing')),
 object_path text NOT NULL UNIQUE,
 position integer NOT NULL DEFAULT 0 CHECK(position BETWEEN 0 AND 4),
 status text NOT NULL DEFAULT 'reserved' CHECK(status IN ('reserved','ready','removed')),
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((kind='avatar' AND listing_id IS NULL) OR (kind='listing' AND listing_id IS NOT NULL))
);
CREATE INDEX member_media_owner_idx ON public.member_media_assets(user_id,created_at DESC);
CREATE INDEX member_media_listing_idx ON public.member_media_assets(listing_id) WHERE status<>'removed';
ALTER TABLE public.member_profiles ADD COLUMN avatar_asset_id uuid REFERENCES public.member_media_assets(id) ON DELETE SET NULL;

ALTER TABLE public.member_classifieds_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_bike_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_classifieds_settings,public.member_bike_listings,public.member_media_assets FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.member_classifieds_settings,public.member_bike_listings,public.member_media_assets TO service_role;

CREATE FUNCTION public.member_classifieds_pilot(p_actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE((SELECT s.enabled AND s.pilot_user_id=p_actor AND c.enabled
 FROM public.member_classifieds_settings s CROSS JOIN public.member_community_settings c WHERE s.singleton AND c.singleton),false)
 AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=p_actor AND NOT COALESCE(u.is_anonymous,false));
$$;
REVOKE ALL ON FUNCTION public.member_classifieds_pilot(uuid) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.member_classifieds_visible(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.member_classifieds_pilot(p_user) AND public.member_identity_verified(p_user);
$$;
REVOKE ALL ON FUNCTION public.member_classifieds_visible(uuid) FROM PUBLIC,anon,authenticated;

-- Paths are opaque reservations, never supplied by the browser. This helper reveals
-- only access to one already-known path and protects against other bucket policies.
CREATE FUNCTION public.member_media_access(p_path text,p_operation text) RETURNS boolean
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
   EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.status='published' AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id))
   OR (a.kind='avatar' AND p.avatar_asset_id=a.id AND EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.user_id=a.user_id AND l.status='published' AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id)))
  ))
  ELSE false END);
$$;
REVOKE ALL ON FUNCTION public.member_media_access(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_media_access(text,text) TO anon,authenticated,service_role;

INSERT INTO storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 VALUES('member-media','member-media',false,2097152,ARRAY['image/webp']);
CREATE POLICY member_media_read ON storage.objects FOR SELECT TO anon,authenticated
 USING(bucket_id='member-media' AND public.member_media_access(name,'select'));
CREATE POLICY member_media_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='member-media' AND public.member_media_access(name,'insert'));
CREATE POLICY member_media_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='member-media' AND public.member_media_access(name,'delete'));
CREATE POLICY member_media_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(bucket_id<>'member-media' OR public.member_media_access(name,'select'));
CREATE POLICY member_media_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK(bucket_id<>'member-media' OR public.member_media_access(name,'insert'));
CREATE POLICY member_media_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING(bucket_id<>'member-media') WITH CHECK(bucket_id<>'member-media');
CREATE POLICY member_media_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
 USING(bucket_id<>'member-media' OR public.member_media_access(name,'delete'));

CREATE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('id',p_listing.id,'title',p_listing.title,'brand',p_listing.brand,'model',p_listing.model,
 'priceCents',p_listing.price_cents,'city',p_listing.city,'state',p_listing.state,'modelYear',p_listing.model_year,
 'mileageKm',p_listing.mileage_km,'condition',p_listing.condition,'battery',p_listing.battery,'invoice',p_listing.invoice,
 'description',p_listing.description,'maintenance',p_listing.maintenance,'status',p_listing.status,
 'feeCents',p_listing.fee_cents,'feeStatus',p_listing.fee_status,'publishedAt',p_listing.published_at,'updatedAt',p_listing.updated_at,
 'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status',a.status) ORDER BY a.position,a.created_at)
 FROM public.member_media_assets a WHERE a.listing_id=p_listing.id AND a.status<>'removed'),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.member_listing_json(public.member_bike_listings) FROM PUBLIC,anon,authenticated;

CREATE FUNCTION public.member_classifieds(p_action text DEFAULT 'account',p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); profile public.member_profiles; listing public.member_bike_listings;
 asset public.member_media_assets; asset_id uuid; new_id uuid; position_number integer;
BEGIN
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND NOT COALESCE(is_anonymous,false)) THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>12000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT * INTO profile FROM public.member_profiles WHERE user_id=actor FOR UPDATE;
 IF p_action='account' THEN
  RETURN jsonb_build_object('displayName',profile.display_name,'communityJoined',profile.community_joined_at IS NOT NULL,
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
  IF char_length(btrim(COALESCE(p_payload->>'title',''))) NOT BETWEEN 6 AND 100 OR
   char_length(btrim(COALESCE(p_payload->>'brand',''))) NOT BETWEEN 1 AND 60 OR
   char_length(btrim(COALESCE(p_payload->>'model',''))) NOT BETWEEN 1 AND 80 OR
   char_length(btrim(COALESCE(p_payload->>'city',''))) NOT BETWEEN 2 AND 80 OR
   char_length(btrim(COALESCE(p_payload->>'description',''))) NOT BETWEEN 20 AND 4000 OR
   COALESCE(p_payload->>'state','')='' OR COALESCE((p_payload->>'priceCents')::integer,0)<100 OR
   (p_payload->>'modelYear')::integer>extract(year FROM now())::integer+1 OR p_payload->>'mileageKm' IS NULL OR p_payload->>'condition' IS NULL OR p_payload->>'battery' IS NULL OR p_payload->>'invoice' IS NULL
   THEN RAISE EXCEPTION 'listing_invalid'; END IF;
  UPDATE public.member_bike_listings SET title=btrim(p_payload->>'title'),brand=btrim(p_payload->>'brand'),model=btrim(p_payload->>'model'),
   price_cents=(p_payload->>'priceCents')::integer,city=btrim(p_payload->>'city'),state=p_payload->>'state',model_year=(p_payload->>'modelYear')::integer,
   mileage_km=(p_payload->>'mileageKm')::integer,condition=p_payload->>'condition',battery=p_payload->>'battery',invoice=(p_payload->>'invoice')::boolean,
   description=btrim(p_payload->>'description'),maintenance=btrim(COALESCE(p_payload->>'maintenance','')),updated_at=now() WHERE id=listing.id RETURNING * INTO listing;
 ELSIF p_action='publish' THEN
  IF NOT public.member_classifieds_visible(actor) THEN RAISE EXCEPTION 'identity_verification_required'; END IF;
  IF listing.status<>'draft' OR char_length(listing.title)<6 OR listing.brand='' OR listing.model='' OR listing.price_cents<100 OR listing.city='' OR listing.state='' OR listing.mileage_km IS NULL OR char_length(listing.description)<20 OR
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

CREATE FUNCTION public.member_bike_listings_public(p_id uuid DEFAULT NULL,p_limit integer DEFAULT 12,p_offset integer DEFAULT 0) RETURNS jsonb
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
  (public.member_listing_json(l)-'images') || jsonb_build_object('sellerName',i.display_name,'avatarPath',i.avatar_path,
   'whatsapp',replace(i.phone_number,'+',''),
   'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status','ready') ORDER BY a.position,a.created_at) FROM public.member_media_assets a WHERE a.listing_id=i.id AND a.status='ready'),'[]'::jsonb))
  ORDER BY i.published_at DESC,i.id) FROM items i JOIN public.member_bike_listings l ON l.id=i.id),'[]'::jsonb));
$$;
REVOKE ALL ON FUNCTION public.member_bike_listings_public(uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_bike_listings_public(uuid,integer,integer) TO anon,authenticated,service_role;

CREATE FUNCTION public.member_bike_image_public(p_id uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT a.object_path FROM public.member_media_assets a WHERE a.id=p_id AND a.status='ready' AND (
  EXISTS(SELECT 1 FROM public.member_bike_listings l WHERE l.id=a.listing_id AND l.status='published' AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id))
  OR (a.kind='avatar' AND EXISTS(SELECT 1 FROM public.member_profiles p JOIN public.member_bike_listings l ON l.user_id=p.user_id WHERE p.avatar_asset_id=a.id AND l.status='published' AND l.contact_consent_at IS NOT NULL AND public.member_classifieds_visible(l.user_id)))
 );
$$;
REVOKE ALL ON FUNCTION public.member_bike_image_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.member_bike_image_public(uuid) TO anon,authenticated,service_role;

COMMIT;
