-- Corrected product contract: one community membership includes the newsletter.
-- Additive correction; never remove the two migrations already applied.
BEGIN;
ALTER TABLE public.member_profiles ADD COLUMN community_joined_at timestamptz;
ALTER TABLE public.member_profiles ADD COLUMN community_consent_version text;
ALTER TABLE public.member_profiles ADD COLUMN newsletter_subscription_id uuid REFERENCES public.newsletter_subscriptions(id) ON DELETE SET NULL;
ALTER TABLE public.member_referral_signups ADD COLUMN community_member boolean NOT NULL DEFAULT false;
ALTER TABLE public.member_referral_signups ADD COLUMN invitee_user_id uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE FUNCTION public.member_community_account(p_action text DEFAULT 'profile',p_payload jsonb DEFAULT '{}'::jsonb)
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
    ON CONFLICT(email) DO UPDATE SET person_name=EXCLUDED.person_name,status='interested',suppressed_at=NULL,
      consent_text=EXCLUDED.consent_text,consent_version='v2',consent_at=EXCLUDED.consent_at,interest='general',source_url=EXCLUDED.source_url,updated_at=now()
    RETURNING id INTO subscription;
   ELSE
    -- First community adhesion is a fresh, explicit combined consent. Subsequent
    -- logins never enter this branch and therefore respect a later unsubscribe.
    UPDATE public.newsletter_subscriptions SET person_name=person,status='interested',suppressed_at=NULL,
      consent_text=consent,consent_version='v2',consent_at=now(),interest='general',source_url='https://vitalemobilidade.com/conta',updated_at=now()
    WHERE id=subscription;
   END IF;
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
  'pending',(SELECT count(*) FROM auth.users u WHERE u.email IS NOT NULL AND u.email_confirmed_at IS NULL AND NOT COALESCE(u.is_anonymous,false)
    AND u.raw_user_meta_data->>'community_invitation_code'=link.code
    AND u.raw_user_meta_data->>'community_consent_version'='2026-11-03' AND u.raw_user_meta_data->'community_newsletter_consent'='true'::jsonb
    AND COALESCE(u.confirmation_sent_at,u.created_at)>now()-interval '48 hours'),
  'confirmed',(SELECT count(*) FROM public.member_referral_signups WHERE referrer_id=actor AND status='confirmed' AND credited AND community_member),'history',history);
END $$;

-- Preserve the public visit collector, but never create a newsletter-only
-- referral or send a second confirmation email under the corrected contract.
CREATE OR REPLACE FUNCTION public.newsletter_referral_service(p_action text,p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner_id uuid; attempts integer; request_fingerprint text; actor uuid;
BEGIN
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>4096 THEN RAISE EXCEPTION 'invalid_input'; END IF;
 IF NOT COALESCE((SELECT enabled FROM public.member_referral_settings WHERE singleton),false)
  OR NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RETURN jsonb_build_object('kind','disabled'); END IF;
 IF p_action='register' THEN RETURN jsonb_build_object('kind','unattributed'); END IF;
 IF p_action='confirm' THEN RETURN jsonb_build_object('kind','invalid'); END IF;
 IF p_action<>'visit' OR p_action IS NULL THEN RAISE EXCEPTION 'invalid_action'; END IF;
 SELECT l.user_id INTO owner_id FROM public.member_referral_links l JOIN public.member_profiles p ON p.user_id=l.user_id
 JOIN auth.users u ON u.id=l.user_id WHERE l.code=p_payload->>'code' AND p.community_joined_at IS NOT NULL AND NOT p.suspended
   AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false);
 IF owner_id IS NULL THEN RETURN jsonb_build_object('kind','unattributed'); END IF;
 actor:=(p_payload->>'actorId')::uuid;
 IF actor=owner_id THEN RETURN jsonb_build_object('kind','recorded'); END IF;
 request_fingerprint:=p_payload->>'fingerprint';
 IF request_fingerprint IS NULL OR request_fingerprint !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
 INSERT INTO public.newsletter_throttle(fingerprint,attempts,window_started_at) VALUES('community-referral-visit:'||request_fingerprint,1,now())
 ON CONFLICT(fingerprint) DO UPDATE SET
  attempts=CASE WHEN public.newsletter_throttle.window_started_at<now()-interval '10 minutes' THEN 1 ELSE public.newsletter_throttle.attempts+1 END,
  window_started_at=CASE WHEN public.newsletter_throttle.window_started_at<now()-interval '10 minutes' THEN now() ELSE public.newsletter_throttle.window_started_at END
 RETURNING newsletter_throttle.attempts INTO attempts;
 IF attempts<=20 THEN
  INSERT INTO public.member_referral_visits(code,day,visits) VALUES(p_payload->>'code',(now() AT TIME ZONE 'America/Sao_Paulo')::date,1)
  ON CONFLICT(code,day) DO UPDATE SET visits=public.member_referral_visits.visits+1;
 END IF;
 RETURN jsonb_build_object('kind','recorded');
END $$;

-- The original comment RPC is replaced below only to require completed
-- community membership before a new contribution. Existing removal stays valid.

CREATE OR REPLACE FUNCTION public.member_community(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  actor uuid := auth.uid();
  profile public.member_profiles;
  item public.member_article_comments;
  article uuid;
  result jsonb;
  name text;
  content text;
  state text;
  page_offset integer;
  today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
BEGIN
  IF p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' OR octet_length(p_payload::text) > 16384 THEN
    RAISE EXCEPTION 'invalid_input';
  END IF;
  IF p_action = 'status' THEN
    RETURN jsonb_build_object('enabled', COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton), false));
  END IF;

  IF p_action IN ('moderation_list','moderate','suspend_author') THEN
    IF actor IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.editorial_admin_memberships m WHERE m.user_id=actor AND m.active AND m.role='admin'
    ) THEN RAISE EXCEPTION 'forbidden'; END IF;
    IF p_action = 'moderation_list' THEN
      state := COALESCE(p_payload->>'status', 'pending');
      IF state NOT IN ('pending','approved','rejected') THEN RAISE EXCEPTION 'invalid_input'; END IF;
      page_offset := COALESCE((p_payload->>'offset')::integer, 0);
      IF page_offset < 0 OR page_offset > 10000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
      SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (
        SELECT c.id, c.body, c.status, c.created_at AS "createdAt", c.author_name AS "authorName",
          p.suspended, a.title AS "articleTitle", a.slug AS "articleSlug"
        FROM public.member_article_comments c JOIN public.member_profiles p ON p.user_id=c.user_id
        JOIN public.editorial_articles a ON a.id=c.article_id
        WHERE c.status=state ORDER BY c.created_at DESC, c.id DESC LIMIT 21 OFFSET page_offset
      ) q;
      RETURN result;
    END IF;
    IF p_action = 'suspend_author' THEN
      -- Suspension locks only the profile. Do not take a comment lock before it:
      -- the author's own removal takes profile then comment in that order.
      SELECT * INTO item FROM public.member_article_comments WHERE id=(p_payload->>'id')::uuid;
    ELSE
      SELECT * INTO item FROM public.member_article_comments WHERE id=(p_payload->>'id')::uuid FOR UPDATE;
    END IF;
    IF NOT FOUND OR item.status='removed' THEN RAISE EXCEPTION 'comment_unavailable'; END IF;
    IF p_action = 'moderate' THEN
      state := p_payload->>'status';
      IF state IS NULL OR state NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid_input'; END IF;
      UPDATE public.member_article_comments SET status=state, moderated_by=actor, moderated_at=now() WHERE id=item.id;
    ELSE
      IF jsonb_typeof(p_payload->'suspended') IS DISTINCT FROM 'boolean' THEN RAISE EXCEPTION 'invalid_input'; END IF;
      UPDATE public.member_profiles SET suspended=(p_payload->>'suspended')::boolean, updated_at=now() WHERE user_id=item.user_id;
      state := CASE WHEN (p_payload->>'suspended')::boolean THEN 'suspended' ELSE 'restored' END;
    END IF;
    INSERT INTO public.member_moderation_audit(actor,action,target_id) VALUES(actor,p_action||':'||state,item.id);
    RETURN jsonb_build_object('ok',true);
  END IF;

  IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton), false) THEN
    RAISE EXCEPTION 'community_disabled';
  END IF;

  IF p_action = 'comments' THEN
    article := (p_payload->>'articleId')::uuid;
    page_offset := COALESCE((p_payload->>'offset')::integer, 0);
    IF page_offset < 0 OR page_offset > 10000 THEN RAISE EXCEPTION 'invalid_input'; END IF;
    SELECT COALESCE(jsonb_agg(to_jsonb(q)), '[]'::jsonb) INTO result FROM (
      SELECT c.id, c.body, c.status, c.created_at AS "createdAt", c.author_name AS "authorName", COALESCE(c.user_id=actor, false) AS "isOwn"
      FROM public.member_article_comments c JOIN public.member_profiles p ON p.user_id=c.user_id
      JOIN public.editorial_articles a ON a.id=c.article_id AND a.status='published'
      WHERE c.article_id=article AND ((c.status='approved' AND NOT p.suspended) OR (c.user_id=actor AND c.status <> 'removed'))
      ORDER BY c.created_at DESC, c.id DESC LIMIT 21 OFFSET page_offset
    ) q;
    RETURN result;
  END IF;

  -- A session (or an anonymous Auth identity) is insufficient: require verified email.
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id=actor AND u.email IS NOT NULL AND u.email_confirmed_at IS NOT NULL AND NOT COALESCE(u.is_anonymous,false)
  ) THEN RAISE EXCEPTION 'email_confirmation_required'; END IF;

  IF p_action = 'save_profile' THEN
    name := btrim(p_payload->>'displayName');
    IF name IS NULL OR char_length(name) NOT BETWEEN 2 AND 60 OR name ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'invalid_name'; END IF;
    IF p_payload->'privacyAcknowledged' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'privacy_required'; END IF;
    INSERT INTO public.member_profiles(user_id,display_name) VALUES(actor,name)
    ON CONFLICT (user_id) DO UPDATE SET display_name=EXCLUDED.display_name, updated_at=now();
  END IF;
  SELECT * INTO profile FROM public.member_profiles WHERE user_id=actor FOR UPDATE;
  IF p_action IN ('profile','save_profile') THEN
    RETURN CASE WHEN profile.user_id IS NULL THEN 'null'::jsonb ELSE
      jsonb_build_object('displayName',profile.display_name,'suspended',profile.suspended,'createdAt',profile.created_at) END;
  END IF;
  IF profile.user_id IS NULL THEN RAISE EXCEPTION 'profile_required'; END IF;

  IF p_action = 'remove_comment' THEN
    -- Own removal still works for suspended readers. Keep an empty tombstone for
    -- moderation races; abuse counters are independent of retained comment bodies.
    UPDATE public.member_article_comments SET body='[removido]', status='removed'
    WHERE id=(p_payload->>'id')::uuid AND user_id=actor AND status <> 'removed';
    IF NOT FOUND THEN RAISE EXCEPTION 'comment_unavailable'; END IF;
    RETURN jsonb_build_object('ok',true);
  END IF;
  IF p_action = 'add_comment' THEN
    IF profile.community_joined_at IS NULL THEN RAISE EXCEPTION 'community_join_required'; END IF;
    IF profile.suspended THEN RAISE EXCEPTION 'account_suspended'; END IF;
    article := (p_payload->>'articleId')::uuid;
    content := btrim(p_payload->>'body');
    IF content IS NULL OR char_length(content) NOT BETWEEN 3 AND 2000 THEN RAISE EXCEPTION 'invalid_comment'; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.editorial_articles WHERE id=article AND status='published') THEN RAISE EXCEPTION 'article_unavailable'; END IF;
    -- Profile lock serializes concurrent submissions; deletion cannot reset counters.
    IF profile.last_comment_at > now()-interval '60 seconds' OR (profile.comment_day=today AND profile.comment_day_count >= 20) THEN
      RAISE EXCEPTION 'comment_rate_limited';
    END IF;
    UPDATE public.member_profiles SET last_comment_at=now(),comment_day=today,
      comment_day_count=CASE WHEN comment_day=today THEN comment_day_count+1 ELSE 1 END WHERE user_id=actor;
    -- Name is part of the moderated submission. A later profile edit cannot
    -- replace approved public text with an unreviewed name.
    INSERT INTO public.member_article_comments(article_id,user_id,author_name,body) VALUES(article,actor,profile.display_name,content);
    RETURN jsonb_build_object('ok',true);
  END IF;
  RAISE EXCEPTION 'invalid_action';
END $$;
REVOKE ALL ON FUNCTION public.member_community(text,jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_community(text,jsonb) TO anon, authenticated, service_role;

COMMIT;
