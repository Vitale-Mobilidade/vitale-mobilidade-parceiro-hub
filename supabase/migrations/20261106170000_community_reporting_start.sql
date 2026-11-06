BEGIN;
CREATE TABLE public.member_reporting_settings (
 singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
 tracking_since date,
 excluded_order_ids uuid[] NOT NULL DEFAULT '{}',
 note text NOT NULL DEFAULT '',
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK(cardinality(excluded_order_ids)<=100)
);
INSERT INTO public.member_reporting_settings(singleton) VALUES(true);
ALTER TABLE public.member_reporting_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_reporting_settings FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.member_reporting_settings TO service_role;
ALTER FUNCTION public.admin_member_metrics(uuid,integer) RENAME TO admin_member_metrics_before_reporting_start;
REVOKE ALL ON FUNCTION public.admin_member_metrics_before_reporting_start(uuid,integer) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_member_metrics(p_actor uuid,p_days integer DEFAULT 30) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE first_day date; last_day date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date; config public.member_reporting_settings;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_days IS NULL OR p_days NOT BETWEEN 1 AND 90 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT * INTO STRICT config FROM public.member_reporting_settings WHERE singleton;
 first_day:=greatest(last_day-(p_days-1),COALESCE(config.tracking_since,last_day-(p_days-1)));
 RETURN jsonb_build_object('generatedAt',now(),'days',p_days,'trackingSince',config.tracking_since,'excludedOrders',cardinality(config.excluded_order_ids),
 'members',(SELECT count(*) FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false) AND (config.tracking_since IS NULL OR (p.community_joined_at AT TIME ZONE 'America/Sao_Paulo')::date>=config.tracking_since)),
 'listings',(SELECT count(*) FROM public.member_bike_listings WHERE config.tracking_since IS NULL OR (created_at AT TIME ZONE 'America/Sao_Paulo')::date>=config.tracking_since),
 'channelListings',(SELECT count(*) FROM public.member_bike_listings WHERE seller_kind='channel' AND (config.tracking_since IS NULL OR (created_at AT TIME ZONE 'America/Sao_Paulo')::date>=config.tracking_since)),
 'activeListings',(SELECT count(*) FROM public.member_bike_listings WHERE status='published' AND public.member_listing_visible(id) AND public.member_listing_entitled(id) AND (config.tracking_since IS NULL OR (created_at AT TIME ZONE 'America/Sao_Paulo')::date>=config.tracking_since)),
 'grossCents',(SELECT COALESCE(sum(amount_cents),0) FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL AND NOT (id=ANY(config.excluded_order_ids)) AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date BETWEEN first_day AND last_day),
 'reversedPayments',(SELECT count(*) FROM public.member_listing_billing b WHERE b.paid_at IS NOT NULL AND b.billing_model='one_time_90d' AND NOT (b.id=ANY(config.excluded_order_ids)) AND (config.tracking_since IS NULL OR (b.paid_at AT TIME ZONE 'America/Sao_Paulo')::date>=config.tracking_since) AND EXISTS(SELECT 1 FROM public.member_listing_payment_cycles c WHERE c.order_id=b.id AND (c.status LIKE 'REFUND%' OR c.status LIKE 'CHARGEBACK%'))),
 'daily',(SELECT COALESCE(jsonb_agg(jsonb_build_object('day',d::date,'members',(SELECT count(*) FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id WHERE p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false) AND (p.community_joined_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date),'listings',(SELECT count(*) FROM public.member_bike_listings WHERE (created_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date),'payments',(SELECT count(*) FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL AND NOT (id=ANY(config.excluded_order_ids)) AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date),'grossCents',(SELECT COALESCE(sum(amount_cents),0) FROM public.member_listing_billing WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL AND NOT (id=ANY(config.excluded_order_ids)) AND (paid_at AT TIME ZONE 'America/Sao_Paulo')::date=d::date)) ORDER BY d DESC),'[]'::jsonb) FROM generate_series(first_day::timestamp,last_day::timestamp,interval '1 day') d));
END $$;
REVOKE ALL ON FUNCTION public.admin_member_metrics(uuid,integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_member_metrics(uuid,integer) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
