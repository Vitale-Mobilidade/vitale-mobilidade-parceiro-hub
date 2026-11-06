BEGIN;
-- Mirrors ListingDashboard's isEmptyBikeDraft({...listing,status:"draft"}).
-- Reserved/ready photos are content; removed assets are absent from listing.images.
CREATE FUNCTION public.member_listing_has_content(p_listing public.member_bike_listings) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT NOT (
  btrim(p_listing.title) IN ('','Minha bike')
  AND btrim(p_listing.brand)='' AND btrim(p_listing.model)='' AND btrim(p_listing.description)=''
  AND btrim(p_listing.city)='' AND p_listing.state='' AND p_listing.price_cents=0
  AND p_listing.mileage_km IS NULL AND p_listing.model_year IS NULL
  AND p_listing.condition='good' AND p_listing.battery='unknown' AND NOT p_listing.invoice
  AND btrim(p_listing.maintenance)=''
  AND NOT EXISTS(SELECT 1 FROM public.member_media_assets a WHERE a.listing_id=p_listing.id AND a.status<>'removed')
 );
$$;
REVOKE ALL ON FUNCTION public.member_listing_has_content(public.member_bike_listings) FROM PUBLIC,anon,authenticated,service_role;

CREATE OR REPLACE FUNCTION public.member_metrics_between(p_start date,p_end date) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH bounds AS (SELECT p_start::timestamp AT TIME ZONE 'America/Sao_Paulo' a,(p_end+1)::timestamp AT TIME ZONE 'America/Sao_Paulo' b),config AS (SELECT * FROM public.member_reporting_settings WHERE singleton)
 SELECT jsonb_build_object(
 'members',(SELECT count(*) FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id,bounds WHERE p.community_joined_at>=a AND p.community_joined_at<b AND NOT COALESCE(u.is_anonymous,false)),
 'listings',(SELECT count(*) FROM public.member_bike_listings l,bounds WHERE l.created_at>=a AND l.created_at<b AND public.member_listing_has_content(l)),
 'channelListings',(SELECT count(*) FROM public.member_bike_listings l,bounds WHERE l.seller_kind='channel' AND l.created_at>=a AND l.created_at<b AND public.member_listing_has_content(l)),
 'publications',(SELECT count(*) FROM public.member_bike_listings,bounds WHERE first_published_at>=a AND first_published_at<b),
 'payments',(SELECT count(*) FROM public.member_listing_billing,bounds,config WHERE billing_model='one_time_90d' AND paid_at>=a AND paid_at<b AND NOT(id=ANY(excluded_order_ids))),
 'grossCents',(SELECT COALESCE(sum(amount_cents),0) FROM public.member_listing_billing,bounds,config WHERE billing_model='one_time_90d' AND paid_at>=a AND paid_at<b AND NOT(id=ANY(excluded_order_ids))),
 'reversedPayments',(SELECT count(*) FROM public.member_listing_billing o,bounds,config WHERE billing_model='one_time_90d' AND paid_at>=a AND paid_at<b AND NOT(o.id=ANY(excluded_order_ids)) AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=o.id AND (c.status LIKE 'REFUND%' OR c.status LIKE 'CHARGEBACK%'))));
$$;
REVOKE ALL ON FUNCTION public.member_metrics_between(date,date) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
