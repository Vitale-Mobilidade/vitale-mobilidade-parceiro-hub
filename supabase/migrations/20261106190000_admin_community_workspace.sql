BEGIN;
-- Date predicates use timestamp boundaries so these indexes remain usable.
CREATE INDEX member_profiles_reporting_idx ON public.member_profiles(community_joined_at) WHERE community_joined_at IS NOT NULL;
CREATE INDEX member_listings_reporting_idx ON public.member_bike_listings(created_at);
CREATE INDEX member_billing_reporting_idx ON public.member_listing_billing(paid_at) WHERE billing_model='one_time_90d' AND paid_at IS NOT NULL;
-- First publication is a flow, unlike the current active-inventory snapshot.
ALTER TABLE public.member_bike_listings ADD COLUMN first_published_at timestamptz;
UPDATE public.member_bike_listings l SET first_published_at=(SELECT min(t) FROM (
 SELECT l.published_at t UNION ALL SELECT b.display_started_at FROM public.member_listing_billing b WHERE b.purchased_listing_id=l.id UNION ALL SELECT c.started_at FROM public.member_listing_courtesies c WHERE c.listing_id=l.id) evidence);
CREATE FUNCTION public.member_first_publication() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF TG_OP='UPDATE' AND OLD.first_published_at IS NOT NULL THEN NEW.first_published_at:=OLD.first_published_at;
 ELSIF NEW.status='published' THEN NEW.first_published_at:=now();
 ELSE NEW.first_published_at:=NULL; END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.member_first_publication() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER member_first_publication BEFORE INSERT OR UPDATE ON public.member_bike_listings FOR EACH ROW EXECUTE FUNCTION public.member_first_publication();
CREATE INDEX member_first_publication_idx ON public.member_bike_listings(first_published_at) WHERE first_published_at IS NOT NULL;

CREATE FUNCTION public.member_reporting_period(p_period text,p_start date DEFAULT NULL,p_end date DEFAULT NULL,p_now timestamptz DEFAULT now()) RETURNS jsonb LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $$
DECLARE today date:=(p_now AT TIME ZONE 'America/Sao_Paulo')::date; a date; b date; pa date; pb date; n integer;
BEGIN
 CASE p_period
 WHEN 'today' THEN a:=today;b:=today;pa:=a-1;pb:=pa;
 WHEN 'yesterday' THEN a:=today-1;b:=a;pa:=a-1;pb:=pa;
 WHEN 'week' THEN a:=date_trunc('week',today::timestamp)::date;b:=today;pa:=a-7;pb:=b-7;
 WHEN 'month' THEN a:=date_trunc('month',today::timestamp)::date;b:=today;pa:=(a-interval '1 month')::date;pb:=least(a-1,pa+(b-a));
 WHEN 'last7' THEN a:=today-6;b:=today;pa:=a-7;pb:=a-1;
 WHEN 'last30' THEN a:=today-29;b:=today;pa:=a-30;pb:=a-1;
 WHEN 'last90' THEN a:=today-89;b:=today;pa:=a-90;pb:=a-1;
 WHEN 'custom' THEN
  a:=p_start;b:=p_end;
  IF a IS NULL OR b IS NULL OR a>b OR b>today OR b-a>365 OR a<'2000-01-01'::date THEN RAISE EXCEPTION 'invalid_period'; END IF;
  n:=b-a+1;pa:=a-n;pb:=a-1;
 ELSE RAISE EXCEPTION 'invalid_period'; END CASE;
 IF p_period<>'custom' AND (p_start IS NOT NULL OR p_end IS NOT NULL) THEN RAISE EXCEPTION 'invalid_period'; END IF;
 RETURN jsonb_build_object('start',a,'end',b,'previousStart',pa,'previousEnd',pb);
END $$;
REVOKE ALL ON FUNCTION public.member_reporting_period(text,date,date,timestamptz) FROM PUBLIC,anon,authenticated,service_role;

CREATE FUNCTION public.member_metrics_between(p_start date,p_end date) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
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
CREATE FUNCTION public.admin_member_period_metrics(p_actor uuid,p_period text DEFAULT 'last30',p_start date DEFAULT NULL,p_end date DEFAULT NULL) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path='' AS $$
DECLARE r jsonb;config public.member_reporting_settings;a date;b date;pa date;pb date;effective date; prior_effective date;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 r:=public.member_reporting_period(p_period,p_start,p_end);
 SELECT * INTO STRICT config FROM public.member_reporting_settings WHERE singleton;
 a:=(r->>'start')::date;b:=(r->>'end')::date;pa:=(r->>'previousStart')::date;pb:=(r->>'previousEnd')::date;
 effective:=greatest(a,COALESCE(config.tracking_since,a));prior_effective:=greatest(pa,COALESCE(config.tracking_since,pa));
 RETURN r||jsonb_build_object('generatedAt',now(),'period',p_period,'trackingSince',config.tracking_since,'excludedOrders',cardinality(config.excluded_order_ids),'effectiveStart',effective,
 'comparable',config.tracking_since IS NULL OR pa>=config.tracking_since,
 'current',public.member_metrics_between(effective,b),'previous',CASE WHEN config.tracking_since IS NULL OR pa>=config.tracking_since THEN public.member_metrics_between(prior_effective,pb) ELSE NULL END,
 'activeNow',(SELECT count(*) FROM public.member_bike_listings WHERE status='published' AND public.member_listing_visible(id) AND public.member_listing_entitled(id) AND (config.tracking_since IS NULL OR created_at>=config.tracking_since::timestamp AT TIME ZONE 'America/Sao_Paulo')),
 'daily',(SELECT COALESCE(jsonb_agg(public.member_metrics_between(d::date,d::date)||jsonb_build_object('day',d::date) ORDER BY d DESC),'[]'::jsonb) FROM generate_series(effective::timestamp,b::timestamp,interval '1 day')d));
END $$;
REVOKE ALL ON FUNCTION public.admin_member_period_metrics(uuid,text,date,date) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_member_period_metrics(uuid,text,date,date) TO service_role;

-- Private tombstone records a resumable removal; financial foreign keys remain intact.
CREATE TABLE public.member_account_removals (
 user_id uuid PRIMARY KEY REFERENCES auth.users(id),actor_id uuid NOT NULL REFERENCES auth.users(id),requested_at timestamptz NOT NULL DEFAULT now(),completed_at timestamptz
);
ALTER TABLE public.member_account_removals ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_account_removals FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION public.admin_member_summary(uuid) RENAME TO admin_member_summary_before_workspace;
REVOKE ALL ON FUNCTION public.admin_member_summary_before_workspace(uuid) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_member_summary(p_id uuid) RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT public.admin_member_summary_before_workspace(p_id)||jsonb_build_object('removalPending',EXISTS(SELECT 1 FROM public.member_account_removals WHERE user_id=p_id AND completed_at IS NULL));
$$;
REVOKE ALL ON FUNCTION public.admin_member_summary(uuid) FROM PUBLIC,anon,authenticated,service_role;
ALTER FUNCTION public.admin_community_manage(uuid,text,jsonb) RENAME TO admin_community_manage_before_workspace;
REVOKE ALL ON FUNCTION public.admin_community_manage_before_workspace(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
CREATE FUNCTION public.admin_community_manage(p_actor uuid,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE q text;digits text;off integer;sort_by text;dir text;items jsonb;total bigint;target uuid;profile public.member_profiles;removal public.member_account_removals;
BEGIN
 IF NOT EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=p_actor AND active AND role='admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>2048 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 IF p_action='members' THEN
  q:=lower(btrim(COALESCE(p_payload->>'query','')));digits:=regexp_replace(q,'[^0-9]','','g');off:=COALESCE((p_payload->>'offset')::integer,0);sort_by:=COALESCE(p_payload->>'orderBy','createdAt');dir:=COALESCE(p_payload->>'direction','desc');
  IF char_length(q)>120 OR off NOT BETWEEN 0 AND 100000 OR sort_by NOT IN ('name','listings','createdAt') OR dir NOT IN ('asc','desc') THEN RAISE EXCEPTION 'invalid_input'; END IF;
  WITH matching AS (SELECT p.user_id,p.community_joined_at,translate(lower(p.display_name),'áàâãäéèêëíìîïóòôõöúùûüçñ','aaaaaeeeeiiiiooooouuuucn') name,(SELECT count(*) FROM public.member_bike_listings l WHERE l.user_id=p.user_id AND l.seller_kind='individual') listings
   FROM public.member_profiles p JOIN auth.users u ON u.id=p.user_id LEFT JOIN public.member_identity_verifications v ON v.user_id=p.user_id
   WHERE p.community_joined_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false) AND (q='' OR strpos(lower(p.display_name),q)>0 OR strpos(lower(COALESCE(u.email,'')),q)>0 OR (digits<>'' AND strpos(regexp_replace(COALESCE(v.phone_number,(SELECT destination FROM public.member_identity_challenges WHERE user_id=p.user_id AND channel='phone'),u.raw_user_meta_data->>'phone',''),'[^0-9]','','g'),digits)>0))),
  ranked AS (SELECT *,row_number() OVER(ORDER BY
   CASE WHEN sort_by='name' AND dir='asc' THEN name END ASC,CASE WHEN sort_by='name' AND dir='desc' THEN name END DESC,
   CASE WHEN sort_by='listings' AND dir='asc' THEN listings END ASC,CASE WHEN sort_by='listings' AND dir='desc' THEN listings END DESC,
   CASE WHEN sort_by='createdAt' AND dir='asc' THEN community_joined_at END ASC,CASE WHEN sort_by='createdAt' AND dir='desc' THEN community_joined_at END DESC,user_id) rn FROM matching)
  SELECT (SELECT count(*) FROM matching),COALESCE((SELECT jsonb_agg(public.admin_member_summary(x.user_id) ORDER BY x.rn) FROM (SELECT * FROM ranked ORDER BY rn LIMIT 20 OFFSET off)x),'[]'::jsonb) INTO total,items;
  RETURN jsonb_build_object('total',total,'items',items,'offset',off);
 END IF;
 IF p_action NOT IN ('prepare_removal','finish_removal') THEN RETURN public.admin_community_manage_before_workspace(p_actor,p_action,p_payload); END IF;
 target:=(p_payload->>'userId')::uuid;
 IF target IS NULL OR target=p_actor OR EXISTS(SELECT 1 FROM public.editorial_admin_memberships WHERE user_id=target) OR EXISTS(SELECT 1 FROM public.member_bike_listings WHERE user_id=target AND seller_kind='channel') THEN RAISE EXCEPTION 'protected_account'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended(target::text,9150));
 SELECT * INTO profile FROM public.member_profiles WHERE user_id=target FOR UPDATE;
 SELECT * INTO removal FROM public.member_account_removals WHERE user_id=target;
 IF NOT FOUND AND profile.community_joined_at IS NULL THEN RAISE EXCEPTION 'member_unavailable'; END IF;
 IF p_action='prepare_removal' THEN
  IF EXISTS(SELECT 1 FROM public.member_listing_billing WHERE user_id=target AND paid_at IS NULL AND status IN ('pending','uncertain') AND checkout_expires_at>now()) THEN RAISE EXCEPTION 'payment_pending'; END IF;
  IF removal.user_id IS NULL AND NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target AND lower(btrim(email))=lower(btrim(p_payload->>'email'))) THEN RAISE EXCEPTION 'email_mismatch'; END IF;
  INSERT INTO public.member_account_removals(user_id,actor_id) VALUES(target,p_actor) ON CONFLICT(user_id) DO NOTHING;
  UPDATE public.member_profiles SET suspended=true,updated_at=now() WHERE user_id=target;
  UPDATE public.member_bike_listings SET status='archived',contact_consent_at=NULL,updated_at=now() WHERE user_id=target AND seller_kind='individual' AND status<>'archived';
  RETURN jsonb_build_object('alreadyDeleted',EXISTS(SELECT 1 FROM auth.users WHERE id=target AND deleted_at IS NOT NULL),
   'paths',COALESCE((SELECT jsonb_agg(object_path ORDER BY object_path) FROM public.member_media_assets WHERE user_id=target),'[]'::jsonb));
 END IF;
 IF removal.user_id IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=target AND deleted_at IS NOT NULL) THEN RAISE EXCEPTION 'removal_not_ready'; END IF;
 UPDATE public.member_profiles SET display_name='Usuário removido',community_joined_at=NULL,avatar_asset_id=NULL,suspended=true,updated_at=now() WHERE user_id=target;
 UPDATE public.member_bike_listings SET title='Anúncio removido',description='',maintenance='',confirmed_phone=NULL,whatsapp_message='',contact_consent_at=NULL,contact_confirmed_at=NULL,status='archived',updated_at=now() WHERE user_id=target AND seller_kind='individual';
 UPDATE public.member_media_assets SET status='removed' WHERE user_id=target;
 DELETE FROM public.member_identity_challenges WHERE user_id=target;
 DELETE FROM public.member_identity_verifications WHERE user_id=target;
 UPDATE public.member_account_removals SET completed_at=COALESCE(completed_at,now()) WHERE user_id=target;
 RETURN jsonb_build_object('removed',true);
END $$;
REVOKE ALL ON FUNCTION public.admin_community_manage(uuid,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_community_manage(uuid,text,jsonb) TO service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
