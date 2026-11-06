BEGIN;
-- Restore the original aggregate; no listing, payment or setting is changed.
CREATE OR REPLACE FUNCTION public.member_metrics_between(p_start date,p_end date) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 WITH bounds AS (SELECT p_start::timestamp AT TIME ZONE 'America/Sao_Paulo' a,(p_end+1)::timestamp AT TIME ZONE 'America/Sao_Paulo' b),config AS (SELECT * FROM public.member_reporting_settings WHERE singleton)
 SELECT jsonb_build_object(
 'members',(SELECT count(*) FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id,bounds WHERE p.community_joined_at>=a AND p.community_joined_at<b AND NOT COALESCE(u.is_anonymous,false)),
 'listings',(SELECT count(*) FROM public.member_bike_listings,bounds WHERE created_at>=a AND created_at<b),
 'channelListings',(SELECT count(*) FROM public.member_bike_listings,bounds WHERE seller_kind='channel' AND created_at>=a AND created_at<b),
 'publications',(SELECT count(*) FROM public.member_bike_listings,bounds WHERE first_published_at>=a AND first_published_at<b),
 'payments',(SELECT count(*) FROM public.member_listing_billing,bounds,config WHERE billing_model='one_time_90d' AND paid_at>=a AND paid_at<b AND NOT(id=ANY(excluded_order_ids))),
 'grossCents',(SELECT COALESCE(sum(amount_cents),0) FROM public.member_listing_billing,bounds,config WHERE billing_model='one_time_90d' AND paid_at>=a AND paid_at<b AND NOT(id=ANY(excluded_order_ids))),
 'reversedPayments',(SELECT count(*) FROM public.member_listing_billing o,bounds,config WHERE billing_model='one_time_90d' AND paid_at>=a AND paid_at<b AND NOT(o.id=ANY(excluded_order_ids)) AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=o.id AND (c.status LIKE 'REFUND%' OR c.status LIKE 'CHARGEBACK%'))));
$$;
REVOKE ALL ON FUNCTION public.member_metrics_between(date,date) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
