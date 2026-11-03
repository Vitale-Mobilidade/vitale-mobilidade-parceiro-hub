-- Local, additive preparation. Requires member accounts and existing newsletter schema.
BEGIN;
CREATE TABLE public.member_referral_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK(singleton),
  enabled boolean NOT NULL DEFAULT false,
  daily_mail_limit integer NOT NULL DEFAULT 100 CHECK(daily_mail_limit BETWEEN 1 AND 1000),
  mail_day date,
  mail_attempts integer NOT NULL DEFAULT 0
);
INSERT INTO public.member_referral_settings(singleton) VALUES(true);
CREATE TABLE public.member_referral_links (
  user_id uuid PRIMARY KEY REFERENCES public.member_profiles(user_id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-','') CHECK(code ~ '^[a-f0-9]{32}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.member_referral_visits (
  code text NOT NULL REFERENCES public.member_referral_links(code) ON DELETE CASCADE,
  day date NOT NULL,
  visits integer NOT NULL DEFAULT 0 CHECK(visits >= 0),
  PRIMARY KEY(code,day)
);
CREATE TABLE public.member_referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES public.member_referral_links(user_id) ON DELETE CASCADE,
  email_key bytea NOT NULL UNIQUE,
  candidate_email text,
  candidate_name text,
  consent_at timestamptz NOT NULL DEFAULT now(),
  nonce uuid NOT NULL DEFAULT gen_random_uuid(),
  token_hash bytea UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT now()+interval '48 hours',
  status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','ineligible','expired')),
  credited boolean NOT NULL DEFAULT false,
  subscription_id uuid UNIQUE REFERENCES public.newsletter_subscriptions(id) ON DELETE SET NULL,
  last_mail_attempt_at timestamptz,
  mail_state text NOT NULL DEFAULT 'pending' CHECK(mail_state IN ('pending','sent','failed')),
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK((status='pending' AND candidate_email IS NOT NULL AND candidate_name IS NOT NULL) OR
    (status<>'pending' AND candidate_email IS NULL AND candidate_name IS NULL))
);
CREATE INDEX member_referral_signups_owner_idx ON public.member_referral_signups(referrer_id,status,confirmed_at);
DO $$DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['member_referral_settings','member_referral_links','member_referral_visits','member_referral_signups'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC,anon,authenticated',t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
  END LOOP;
END $$;

CREATE FUNCTION public.member_referrals() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); link public.member_referral_links; history jsonb;
BEGIN
  IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false)
    OR NOT COALESCE((SELECT enabled FROM public.member_referral_settings WHERE singleton),false) THEN
    RETURN jsonb_build_object('enabled',false);
  END IF;
  IF actor IS NULL OR NOT EXISTS(SELECT 1 FROM auth.users WHERE id=actor AND email_confirmed_at IS NOT NULL AND email IS NOT NULL AND NOT COALESCE(is_anonymous,false)) THEN
    RAISE EXCEPTION 'email_confirmation_required';
  END IF;
  IF NOT EXISTS(SELECT 1 FROM public.member_profiles WHERE user_id=actor AND NOT suspended) THEN RAISE EXCEPTION 'profile_required'; END IF;
  INSERT INTO public.member_referral_links(user_id) VALUES(actor) ON CONFLICT(user_id) DO NOTHING;
  SELECT * INTO link FROM public.member_referral_links WHERE user_id=actor;
  SELECT COALESCE(jsonb_agg(to_jsonb(q) ORDER BY q.day DESC),'[]'::jsonb) INTO history FROM (
    SELECT (confirmed_at AT TIME ZONE 'America/Sao_Paulo')::date AS day,count(*) AS confirmed
    FROM public.member_referral_signups WHERE referrer_id=actor AND credited AND status='confirmed'
      AND (confirmed_at AT TIME ZONE 'America/Sao_Paulo')::date >= (now() AT TIME ZONE 'America/Sao_Paulo')::date-29
    GROUP BY 1
  ) q;
  RETURN jsonb_build_object('enabled',true,'code',link.code,
    'visits',COALESCE((SELECT sum(visits) FROM public.member_referral_visits WHERE code=link.code),0),
    'pending',(SELECT count(*) FROM public.member_referral_signups WHERE referrer_id=actor AND status='pending' AND expires_at>now()),
    'confirmed',(SELECT count(*) FROM public.member_referral_signups WHERE referrer_id=actor AND status='confirmed' AND credited),
    'history',history);
END $$;
REVOKE ALL ON FUNCTION public.member_referrals() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_referrals() TO authenticated,service_role;

-- Only the existing newsletter-interest backend can call these operations.
-- The browser cannot supply trusted identity, mint tokens or award credit.
CREATE FUNCTION public.newsletter_referral_service(p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE
  settings public.member_referral_settings;
  claim public.member_referral_signups;
  owner_id uuid;
  owner_email text;
  actor uuid;
  normalized_email text;
  person text;
  key bytea;
  secret bytea;
  sender text;
  token text;
  target uuid;
  attempts integer;
  request_fingerprint text;
  clock_day date:=(now() AT TIME ZONE 'America/Sao_Paulo')::date;
  eligible boolean;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>4096 THEN RAISE EXCEPTION 'invalid_input'; END IF;
  SELECT * INTO settings FROM public.member_referral_settings WHERE singleton;
  IF NOT COALESCE(settings.enabled,false) OR NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN
    RETURN jsonb_build_object('kind','disabled');
  END IF;
  actor:=(p_payload->>'actorId')::uuid; -- identity verified by the service, never by client input
  IF p_action='confirm' THEN
    request_fingerprint:=p_payload->>'fingerprint';
    IF request_fingerprint IS NULL OR request_fingerprint !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
    INSERT INTO public.newsletter_throttle(fingerprint,attempts,window_started_at) VALUES('referral-confirm:'||request_fingerprint,1,now())
    ON CONFLICT(fingerprint) DO UPDATE SET
      attempts=CASE WHEN public.newsletter_throttle.window_started_at<now()-interval '10 minutes' THEN 1 ELSE public.newsletter_throttle.attempts+1 END,
      window_started_at=CASE WHEN public.newsletter_throttle.window_started_at<now()-interval '10 minutes' THEN now() ELSE public.newsletter_throttle.window_started_at END
    RETURNING newsletter_throttle.attempts INTO attempts;
    IF attempts>30 THEN RETURN jsonb_build_object('kind','rate_limited'); END IF;
    token:=p_payload->>'token';
    IF token IS NULL OR token !~ '^[a-f0-9]{64}$' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
    SELECT * INTO claim FROM public.member_referral_signups WHERE token_hash=sha256(convert_to(token,'UTF8')) FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('kind','invalid'); END IF;
    IF claim.status IN ('confirmed','ineligible') THEN RETURN jsonb_build_object('kind','confirmed'); END IF;
    IF claim.status<>'pending' OR claim.expires_at<=now() THEN RETURN jsonb_build_object('kind','expired'); END IF;
    SELECT lower(btrim(u.email)),p.suspended=false AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false)
      INTO owner_email,eligible FROM auth.users u JOIN public.member_profiles p ON p.user_id=u.id WHERE u.id=claim.referrer_id;
    eligible:=COALESCE(eligible,false) AND owner_email<>claim.candidate_email AND actor IS DISTINCT FROM claim.referrer_id;
    -- Insert-only: an existing subscription (including an unsubscribe) can never
    -- be reactivated, overwritten or credited by confirmation, even in a race.
    IF NOT EXISTS(SELECT 1 FROM public.newsletter_subscriptions WHERE lower(btrim(email))=claim.candidate_email) THEN
      INSERT INTO public.newsletter_subscriptions(person_name,email,status,delivery_enabled,consent_text,consent_version,consent_at,interest,source_url)
    VALUES(claim.candidate_name,claim.candidate_email,'interested',false,
      'Autorizo a Vitale Mobilidade a guardar meu nome e e-mail e a me contatar sobre a newsletter.','v2',claim.consent_at,'general','https://vitalemobilidade.com/newsletter')
      ON CONFLICT(email) DO NOTHING RETURNING id INTO target;
    END IF;
    UPDATE public.member_referral_signups SET status=CASE WHEN target IS NOT NULL AND eligible THEN 'confirmed' ELSE 'ineligible' END,
      credited=target IS NOT NULL AND eligible,subscription_id=target,confirmed_at=now(),candidate_email=NULL,candidate_name=NULL
      WHERE id=claim.id;
    RETURN jsonb_build_object('kind','confirmed');
  END IF;
  IF p_action='mail_result' THEN
    UPDATE public.member_referral_signups SET mail_state=CASE WHEN p_payload->'sent'='true'::jsonb THEN 'sent' ELSE 'failed' END
    WHERE id=(p_payload->>'id')::uuid AND nonce=(p_payload->>'nonce')::uuid AND status='pending';
    RETURN jsonb_build_object('kind','recorded');
  END IF;
  SELECT l.user_id,lower(btrim(u.email)) INTO owner_id,owner_email
  FROM public.member_referral_links l JOIN public.member_profiles p ON p.user_id=l.user_id
  JOIN auth.users u ON u.id=l.user_id WHERE l.code=p_payload->>'code' AND NOT p.suspended
    AND u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false);
  IF owner_id IS NULL THEN RETURN jsonb_build_object('kind','unattributed'); END IF;
  request_fingerprint:=p_payload->>'fingerprint';
  IF request_fingerprint IS NULL OR request_fingerprint !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF p_action='visit' THEN
    IF actor=owner_id THEN RETURN jsonb_build_object('kind','recorded'); END IF;
    INSERT INTO public.newsletter_throttle(fingerprint,attempts,window_started_at) VALUES('referral-visit:'||request_fingerprint,1,now())
    ON CONFLICT(fingerprint) DO UPDATE SET
      attempts=CASE WHEN public.newsletter_throttle.window_started_at<now()-interval '10 minutes' THEN 1 ELSE public.newsletter_throttle.attempts+1 END,
      window_started_at=CASE WHEN public.newsletter_throttle.window_started_at<now()-interval '10 minutes' THEN now() ELSE public.newsletter_throttle.window_started_at END
    RETURNING newsletter_throttle.attempts INTO attempts;
    IF attempts<=20 THEN
      INSERT INTO public.member_referral_visits(code,day,visits) VALUES(p_payload->>'code',clock_day,1)
      ON CONFLICT(code,day) DO UPDATE SET visits=public.member_referral_visits.visits+1;
    END IF;
    RETURN jsonb_build_object('kind','recorded');
  END IF;
  IF p_action<>'register' THEN RAISE EXCEPTION 'invalid_action'; END IF;
  normalized_email:=lower(btrim(p_payload->>'email')); person:=btrim(p_payload->>'name');
  IF normalized_email IS NULL OR char_length(normalized_email)>254 OR normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    OR person IS NULL OR char_length(person) NOT BETWEEN 2 AND 80 OR p_payload->'consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'invalid_input'; END IF;
  IF owner_email=normalized_email OR actor=owner_id OR EXISTS(SELECT 1 FROM public.newsletter_subscriptions WHERE lower(btrim(email))=normalized_email) THEN
    RETURN jsonb_build_object('kind','pending','send',false);
  END IF;
  -- Lock settings first, then claim: serializes the global email budget and any
  -- concurrent registration for the same mailbox. No award is made on submit.
  SELECT * INTO settings FROM public.member_referral_settings WHERE singleton FOR UPDATE;
  -- Bounded privacy cleanup; no raw recipient information survives expired claims.
  UPDATE public.member_referral_signups SET candidate_email=NULL,candidate_name=NULL,token_hash=NULL,status='expired'
    WHERE id IN (SELECT id FROM public.member_referral_signups WHERE status='pending' AND expires_at<now()-interval '7 days' LIMIT 100);
  key:=sha256(convert_to(normalized_email,'UTF8'));
  SELECT * INTO claim FROM public.member_referral_signups WHERE email_key=key FOR UPDATE;
  IF FOUND AND claim.status IN ('confirmed','ineligible') THEN RETURN jsonb_build_object('kind','pending','send',false); END IF;
  IF claim.id IS NOT NULL AND claim.status='pending' AND claim.expires_at>now() THEN
    IF claim.referrer_id<>owner_id OR claim.last_mail_attempt_at>now()-interval '15 minutes' THEN
      RETURN jsonb_build_object('kind','pending','send',false,'retryFailed',claim.referrer_id=owner_id AND claim.mail_state='failed');
    END IF;
    IF claim.mail_state='sent' THEN
      UPDATE public.member_referral_signups SET nonce=gen_random_uuid(),expires_at=now()+interval '48 hours'
      WHERE id=claim.id RETURNING * INTO claim;
    END IF;
  ELSE
    IF claim.id IS NULL THEN
      INSERT INTO public.member_referral_signups(referrer_id,email_key,candidate_email,candidate_name)
        VALUES(owner_id,key,normalized_email,person) RETURNING * INTO claim;
    ELSE
      UPDATE public.member_referral_signups SET referrer_id=owner_id,candidate_email=normalized_email,candidate_name=person,
        consent_at=now(),nonce=gen_random_uuid(),expires_at=now()+interval '48 hours',status='pending',created_at=now()
      WHERE id=claim.id RETURNING * INTO claim;
    END IF;
  END IF;
  IF settings.mail_day=clock_day AND settings.mail_attempts>=settings.daily_mail_limit THEN RAISE EXCEPTION 'referral_mail_limit'; END IF;
  SELECT signing_key,from_email INTO secret,sender FROM public.newsletter_settings WHERE singleton;
  IF secret IS NULL OR nullif(btrim(sender),'') IS NULL THEN RAISE EXCEPTION 'referral_mail_unavailable'; END IF;
  token:=encode(extensions.hmac(convert_to('newsletter-referral:'||claim.id::text||':'||claim.nonce::text,'UTF8'),secret,'sha256'),'hex');
  UPDATE public.member_referral_signups SET token_hash=sha256(convert_to(token,'UTF8')),last_mail_attempt_at=now(),mail_state='pending' WHERE id=claim.id;
  UPDATE public.member_referral_settings SET mail_day=clock_day,mail_attempts=CASE WHEN mail_day=clock_day THEN mail_attempts+1 ELSE 1 END WHERE singleton;
  RETURN jsonb_build_object('kind','pending','send',true,'id',claim.id,'nonce',claim.nonce,
    'token',token,'email',claim.candidate_email,'from',sender);
END $$;
REVOKE ALL ON FUNCTION public.newsletter_referral_service(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.newsletter_referral_service(text,jsonb) TO service_role;
COMMIT;
