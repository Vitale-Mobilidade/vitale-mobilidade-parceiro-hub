BEGIN;
ALTER TABLE public.member_billing_settings ADD COLUMN hosted_ready boolean NOT NULL DEFAULT false;
ALTER TABLE public.member_listing_billing ADD COLUMN checkout_id text UNIQUE,ADD COLUMN checkout_expires_at timestamptz,ADD COLUMN provider_billing_type text;
ALTER TABLE public.member_listing_billing DROP CONSTRAINT member_listing_billing_method_check;
ALTER TABLE public.member_listing_billing ADD CONSTRAINT member_listing_billing_method_check CHECK(method IN ('card','pix_automatic','hosted'));
ALTER TABLE public.member_billing_events ADD COLUMN order_reference uuid;
ALTER TABLE public.member_billing_events DROP CONSTRAINT member_billing_events_resource_type_check;
ALTER TABLE public.member_billing_events ADD CONSTRAINT member_billing_events_resource_type_check CHECK(resource_type IN ('payment','subscription','authorization','instruction','checkout'));
CREATE OR REPLACE FUNCTION public.member_billing_checkout(p_actor uuid,p_id uuid,p_method text,p_contact boolean,p_monthly boolean) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE l public.member_bike_listings;o public.member_listing_billing;
BEGIN
 IF NOT COALESCE((SELECT enabled AND provider_ready FROM public.member_billing_settings WHERE singleton),false) THEN RAISE EXCEPTION 'billing_unavailable';END IF;
 IF p_method='hosted' AND NOT (SELECT hosted_ready FROM public.member_billing_settings WHERE singleton) THEN RAISE EXCEPTION 'billing_unavailable';END IF;
 IF NOT public.member_classifieds_visible(p_actor) THEN RAISE EXCEPTION 'identity_verification_required';END IF;
 SELECT * INTO l FROM public.member_bike_listings WHERE id=p_id AND user_id=p_actor FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'listing_unavailable'; END IF;
 SELECT * INTO o FROM public.member_listing_billing WHERE listing_id=p_id AND status NOT IN ('cancelled','failed') FOR UPDATE;
 IF FOUND THEN RETURN to_jsonb(o)||jsonb_build_object('reserved',false);END IF;
 IF p_method NOT IN ('card','pix_automatic','hosted') OR p_contact IS DISTINCT FROM true OR p_monthly IS DISTINCT FROM true THEN RAISE EXCEPTION 'billing_consent_required';END IF;
 IF l.status<>'draft' OR l.title='Minha bike' OR char_length(l.title)<6 OR l.brand='' OR l.model='' OR l.price_cents<100 OR l.city='' OR l.state='' OR l.mileage_km IS NULL OR char_length(l.description)<20 OR NOT EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='ready') OR EXISTS(SELECT 1 FROM public.member_media_assets WHERE listing_id=l.id AND status='reserved') THEN RAISE EXCEPTION 'listing_incomplete'; END IF;
 IF (SELECT count(*) FROM public.member_listing_billing WHERE user_id=p_actor AND created_at>now()-interval '24 hours')>=10 THEN RAISE EXCEPTION 'billing_rate_limited';END IF;
 UPDATE public.member_bike_listings SET fee_status='required' WHERE id=p_id;
 INSERT INTO public.member_listing_billing(user_id,listing_id,method,listing_revision,contact_consent_at,monthly_accepted_at,lease_until) VALUES(p_actor,p_id,p_method,l.updated_at,now(),now(),now()+interval '2 minutes') RETURNING * INTO o;
 RETURN to_jsonb(o)||jsonb_build_object('reserved',true);
END $$;

CREATE OR REPLACE FUNCTION public.member_listing_entitled(p_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_listing_billing o WHERE o.listing_id=p_id AND o.status='active' AND o.cancel_requested_at IS NULL AND NOT o.hold AND o.paid_until>now());
$$;
CREATE OR REPLACE FUNCTION public.member_listing_json(p_listing public.member_bike_listings) RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT jsonb_build_object('sellerType',CASE WHEN EXISTS(SELECT 1 FROM public.member_classifieds_settings s WHERE s.channel_seller_user_id=p_listing.user_id) THEN 'channel' ELSE 'individual' END,'id',p_listing.id,'title',p_listing.title,'brand',p_listing.brand,'model',p_listing.model,
 'priceCents',p_listing.price_cents,'city',p_listing.city,'state',p_listing.state,'modelYear',p_listing.model_year,
 'mileageKm',p_listing.mileage_km,'condition',p_listing.condition,'battery',p_listing.battery,'invoice',p_listing.invoice,
 'description',p_listing.description,'maintenance',p_listing.maintenance,'status',p_listing.status,
 'feeCents',p_listing.fee_cents,'feeStatus',CASE WHEN public.member_listing_entitled(p_listing.id) THEN 'paid' ELSE 'required' END,'publishedAt',p_listing.published_at,'updatedAt',p_listing.updated_at,
 'images',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',a.id,'path',a.object_path,'position',a.position,'status',a.status) ORDER BY a.position,a.created_at)
 FROM public.member_media_assets a WHERE a.listing_id=p_listing.id AND a.status<>'removed'),'[]'::jsonb));
$$;

COMMIT;
