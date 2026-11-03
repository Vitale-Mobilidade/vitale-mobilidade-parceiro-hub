-- Additive correction for immediate signup and Resend password recovery.
-- Auth auto-confirm is an explicit provider setting, never inferred as mailbox ownership.
BEGIN;
CREATE OR REPLACE FUNCTION public.member_community_account(p_action text DEFAULT 'profile',p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
 actor uuid:=auth.uid(); profile public.member_profiles; metadata jsonb;
 address text; person text; subscription uuid; invitation text; inviter uuid;
 consent text:='Quero fazer parte da comunidade Vitale Mobilidade e receber sua newsletter. Autorizo o uso do meu nome e e-mail para essa participação e comunicação. Li o aviso de privacidade.';
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RAISE EXCEPTION 'community_disabled'; END IF;
 IF p_action IS NULL OR p_action NOT IN ('profile','join') OR p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>4096 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT lower(btrim(email)),raw_user_meta_data INTO address,metadata FROM auth.users
 WHERE id=actor AND email IS NOT NULL AND email_confirmed_at IS NOT NULL AND NOT COALESCE(is_anonymous,false);
 IF NOT FOUND THEN RAISE EXCEPTION 'email_confirmation_required'; END IF;
 SELECT * INTO profile FROM public.member_profiles WHERE user_id=actor FOR UPDATE;
 IF p_action='join' AND profile.community_joined_at IS NULL THEN
  IF p_payload->'acknowledged' IS DISTINCT FROM 'true'::jsonb AND NOT COALESCE(
    metadata->>'community_consent_version'='2026-11-03' AND metadata->'community_newsletter_consent'='true'::jsonb,false
  ) THEN RAISE EXCEPTION 'community_consent_required'; END IF;
  IF COALESCE(profile.suspended,false) THEN RAISE EXCEPTION 'account_suspended'; END IF;
  person:=COALESCE(NULLIF(btrim(p_payload->>'displayName'),''),profile.display_name,NULLIF(btrim(metadata->>'display_name'),''));
  IF person IS NULL OR char_length(person) NOT BETWEEN 2 AND 60 OR person ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'invalid_name'; END IF;
  INSERT INTO public.member_profiles(user_id,display_name) VALUES(actor,person) ON CONFLICT(user_id) DO NOTHING;
  -- Serializes first login in multiple tabs; signup itself has no auth trigger.
  SELECT * INTO profile FROM public.member_profiles WHERE user_id=actor FOR UPDATE;
  IF profile.community_joined_at IS NULL THEN
   SELECT id INTO subscription FROM public.newsletter_subscriptions WHERE lower(btrim(email))=address LIMIT 1 FOR UPDATE;
   IF subscription IS NULL THEN
    INSERT INTO public.newsletter_subscriptions(person_name,email,status,delivery_enabled,consent_text,consent_version,consent_at,interest,source_url)
    VALUES(person,address,'interested',false,consent,'v2',now(),'general','https://vitalemobilidade.com/conta')
    ON CONFLICT(email) DO NOTHING RETURNING id INTO subscription;
    IF subscription IS NULL THEN
     SELECT id INTO subscription FROM public.newsletter_subscriptions WHERE email=address FOR UPDATE;
    END IF;
   END IF;
   -- Without mailbox verification, account creation must never reactivate or
   -- rewrite a pre-existing newsletter subscription/cancellation for that email.
   UPDATE public.member_profiles SET display_name=person,community_joined_at=now(),community_consent_version='2026-11-03',
     newsletter_subscription_id=subscription,updated_at=now() WHERE user_id=actor;
   invitation:=COALESCE(NULLIF(metadata->>'community_invitation_code',''),NULLIF(p_payload->>'invitationCode',''));
   IF invitation ~ '^[a-f0-9]{32}$' AND COALESCE((SELECT enabled FROM public.member_referral_settings WHERE singleton),false) THEN
    SELECT l.user_id INTO inviter FROM public.member_referral_links l
    JOIN public.member_profiles p ON p.user_id=l.user_id JOIN auth.users u ON u.id=l.user_id
    WHERE l.code=invitation AND l.user_id<>actor AND p.community_joined_at IS NOT NULL AND NOT p.suspended
      AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false) AND lower(btrim(u.email))<>address;
    IF inviter IS NOT NULL THEN
     INSERT INTO public.member_referral_signups(referrer_id,email_key,status,credited,subscription_id,confirmed_at,invitee_user_id,community_member)
     VALUES(inviter,sha256(convert_to(address,'UTF8')),'confirmed',true,subscription,now(),actor,true)
     ON CONFLICT DO NOTHING;
    END IF;
   END IF;
  END IF;
  SELECT * INTO profile FROM public.member_profiles WHERE user_id=actor;
 END IF;
 IF profile.user_id IS NULL THEN RETURN 'null'::jsonb; END IF;
 RETURN jsonb_build_object('displayName',profile.display_name,'suspended',profile.suspended,'createdAt',profile.created_at,
  'communityJoinedAt',profile.community_joined_at,
  'newsletterSubscribed',COALESCE((SELECT status='interested' AND suppressed_at IS NULL FROM public.newsletter_subscriptions WHERE id=profile.newsletter_subscription_id),false));
END $$;
REVOKE ALL ON FUNCTION public.member_community_account(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_community_account(text,jsonb) TO authenticated,service_role;

CREATE OR REPLACE FUNCTION public.member_referrals() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); link public.member_referral_links; history jsonb;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false)
   OR NOT COALESCE((SELECT enabled FROM public.member_referral_settings WHERE singleton),false) THEN RETURN jsonb_build_object('enabled',false); END IF;
 IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL AND email IS NOT NULL AND NOT COALESCE(is_anonymous,false)) THEN RAISE EXCEPTION 'email_confirmation_required'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.member_profiles WHERE user_id=actor AND community_joined_at IS NOT NULL AND NOT suspended) THEN RAISE EXCEPTION 'community_join_required'; END IF;
 INSERT INTO public.member_referral_links(user_id) VALUES(actor) ON CONFLICT(user_id) DO NOTHING;
 SELECT * INTO link FROM public.member_referral_links WHERE user_id=actor;
 SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.day DESC),'[]'::jsonb) INTO history FROM (
  SELECT (confirmed_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,count(*) AS confirmed
  FROM public.member_referral_signups WHERE referrer_id=actor AND credited AND status='confirmed' AND community_member
    AND (confirmed_at AT TIME ZONE 'America/Sao_Paulo')::date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date-29 GROUP BY 1
 ) q;
 RETURN jsonb_build_object('enabled',true,'code',link.code,
  'visits',COALESCE((SELECT sum(visits) FROM public.member_referral_visits WHERE code=link.code),0),
  'pending',(SELECT count(*) FROM auth.users u WHERE u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false)
    AND u.raw_user_meta_data->>'community_invitation_code'=link.code
    AND u.raw_user_meta_data->>'community_consent_version'='2026-11-03' AND u.raw_user_meta_data->'community_newsletter_consent'='true'::jsonb
    AND u.created_at>now()-interval '48 hours'
    AND NOT EXISTS(SELECT 1 FROM public.member_profiles pending_profile WHERE pending_profile.user_id=u.id AND pending_profile.community_joined_at IS NOT NULL)),
  'confirmed',(SELECT count(*) FROM public.member_referral_signups WHERE referrer_id=actor AND status='confirmed' AND credited AND community_member),'history',history);
END $$;


CREATE FUNCTION public.member_password_recovery_budget(p_email text,p_fingerprint text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE keys text[]; limits integer[]:=ARRAY[50,20,5,2]; windows interval[]:=ARRAY[interval '24 hours',interval '1 hour',interval '1 hour',interval '1 hour']; current_attempts integer; i integer;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RETURN false; END IF;
 IF p_email IS NULL OR char_length(p_email)>254 OR p_email<>lower(btrim(p_email)) OR p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  OR p_fingerprint IS NULL OR p_fingerprint !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
 keys:=ARRAY['member-recovery:global-day','member-recovery:global-hour','member-recovery:ip:'||p_fingerprint,'member-recovery:email:'||encode(sha256(convert_to(p_email,'UTF8')),'hex')];
 -- Fixed lock order serializes parallel requests, before generating any token.
 FOR i IN 1..4 LOOP
  INSERT INTO public.newsletter_throttle(fingerprint,attempts,window_started_at) VALUES(keys[i],1,now())
  ON CONFLICT(fingerprint) DO UPDATE SET
   attempts=CASE WHEN public.newsletter_throttle.window_started_at<now()-windows[i] THEN 1 ELSE public.newsletter_throttle.attempts+1 END,
   window_started_at=CASE WHEN public.newsletter_throttle.window_started_at<now()-windows[i] THEN now() ELSE public.newsletter_throttle.window_started_at END
  RETURNING attempts INTO current_attempts;
  IF current_attempts>limits[i] THEN RETURN false; END IF;
 END LOOP;
 RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.member_password_recovery_budget(text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_password_recovery_budget(text,text) TO service_role;

COMMIT;
