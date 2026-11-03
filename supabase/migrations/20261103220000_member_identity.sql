-- Newsletter stays independent. Privileged community interactions require two
-- independent possession proofs; Auth auto-confirm and metadata prove neither.
BEGIN;
CREATE TABLE public.member_identity_verifications(
 user_id uuid PRIMARY KEY REFERENCES public.member_profiles(user_id) ON DELETE CASCADE,
 email_address text, email_verified_at timestamptz,
 phone_number text, phone_verified_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.member_identity_challenges(
 user_id uuid REFERENCES public.member_profiles(user_id) ON DELETE CASCADE,
 channel text CHECK(channel IN ('email','phone')),
 id uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(), destination text NOT NULL,
 code_hash bytea NOT NULL, expires_at timestamptz NOT NULL,
 attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 5),
 created_at timestamptz NOT NULL DEFAULT now(), delivered_at timestamptz, consumed_at timestamptz,
 PRIMARY KEY(user_id,channel)
);
ALTER TABLE public.member_identity_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_identity_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_identity_verifications,public.member_identity_challenges FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.member_identity_verifications,public.member_identity_challenges TO service_role;

CREATE FUNCTION public.member_identity_verified(p_user uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.member_identity_verifications v JOIN auth.users u ON u.id=v.user_id JOIN public.member_profiles p ON p.user_id=v.user_id
 WHERE v.user_id=p_user AND v.email_address=lower(btrim(u.email)) AND v.email_verified_at IS NOT NULL AND v.email_verified_at>=COALESCE(u.email_confirmed_at,u.created_at)
 AND v.phone_number IS NOT NULL AND v.phone_verified_at IS NOT NULL AND p.community_joined_at IS NOT NULL AND NOT p.suspended AND NOT COALESCE(u.is_anonymous,false));
$$;
REVOKE ALL ON FUNCTION public.member_identity_verified(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_identity_verified(uuid) TO service_role;

CREATE FUNCTION public.member_identity(p_action text DEFAULT 'status',p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); address text; address_confirmed_at timestamptz; v public.member_identity_verifications; c public.member_identity_challenges;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RAISE EXCEPTION 'community_disabled'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>2048 OR p_action IS NULL OR p_action NOT IN ('status','verify') THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT lower(btrim(email)),COALESCE(email_confirmed_at,created_at) INTO address,address_confirmed_at FROM auth.users WHERE id=actor AND email IS NOT NULL AND NOT COALESCE(is_anonymous,false);
 IF NOT FOUND THEN RAISE EXCEPTION 'email_confirmation_required'; END IF;
 PERFORM 1 FROM public.member_profiles WHERE user_id=actor AND community_joined_at IS NOT NULL FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'community_join_required'; END IF;
 IF p_action='verify' THEN
  IF p_payload->>'channel' IS NULL OR p_payload->>'channel' NOT IN ('email','phone') OR COALESCE(p_payload->>'code','') !~ '^[0-9]{6}$' THEN RETURN jsonb_build_object('ok',false,'error','identity_invalid_code'); END IF;
  SELECT * INTO c FROM public.member_identity_challenges WHERE user_id=actor AND channel=p_payload->>'channel' FOR UPDATE;
  IF c.user_id IS NULL OR c.delivered_at IS NULL OR c.consumed_at IS NOT NULL OR c.attempts>=5 OR (c.channel='email' AND c.destination<>address) THEN RETURN jsonb_build_object('ok',false,'error','identity_invalid_code'); END IF;
  IF c.expires_at<=now() THEN RETURN jsonb_build_object('ok',false,'error','identity_code_expired'); END IF;
  -- Return instead of raising: a wrong guess must commit the attempt counter.
  UPDATE public.member_identity_challenges SET attempts=attempts+1 WHERE user_id=actor AND channel=c.channel;
  IF c.code_hash IS DISTINCT FROM sha256(convert_to(c.id::text||':'||(p_payload->>'code'),'UTF8')) THEN RETURN jsonb_build_object('ok',false,'error','identity_invalid_code'); END IF;
  INSERT INTO public.member_identity_verifications(user_id) VALUES(actor) ON CONFLICT DO NOTHING;
  IF c.channel='email' THEN UPDATE public.member_identity_verifications SET email_address=c.destination,email_verified_at=now(),updated_at=now() WHERE user_id=actor;
  ELSE UPDATE public.member_identity_verifications SET phone_number=c.destination,phone_verified_at=now(),updated_at=now() WHERE user_id=actor; END IF;
  UPDATE public.member_identity_challenges SET consumed_at=now(),code_hash=sha256(convert_to(gen_random_uuid()::text,'UTF8')) WHERE user_id=actor AND channel=c.channel;
  RETURN jsonb_build_object('ok',true);
 END IF;
 SELECT * INTO v FROM public.member_identity_verifications WHERE user_id=actor;
 RETURN jsonb_build_object('emailVerified',COALESCE(v.email_address=address AND v.email_verified_at IS NOT NULL AND v.email_verified_at>=address_confirmed_at,false),
 'phoneVerified',v.phone_number IS NOT NULL AND v.phone_verified_at IS NOT NULL,
 'phoneMasked',CASE WHEN v.phone_number IS NULL THEN NULL ELSE '+55 •• •••••-'||right(v.phone_number,4) END,
 'canInteract',public.member_identity_verified(actor));
END $$;
REVOKE ALL ON FUNCTION public.member_identity(text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_identity(text,jsonb) TO authenticated,service_role;

CREATE FUNCTION public.member_identity_service(p_action text,p_actor uuid,p_payload jsonb DEFAULT '{}') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE channel_name text:=p_payload->>'channel'; destination text; challenge public.member_identity_challenges;
 generated_code text; challenge_id uuid:=gen_random_uuid(); keys text[]; limits integer[]:=ARRAY[50,20,3,3,10];
 windows interval[]:=ARRAY[interval '24 hours',interval '1 hour',interval '1 hour',interval '1 hour',interval '1 hour']; current_attempts integer; i integer;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RAISE EXCEPTION 'community_disabled'; END IF;
 IF p_payload IS NULL OR jsonb_typeof(p_payload)<>'object' OR octet_length(p_payload::text)>2048 OR p_action IS NULL OR p_action NOT IN ('start','delivered') OR channel_name IS NULL OR channel_name NOT IN ('email','phone') THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT lower(btrim(email)) INTO destination FROM auth.users WHERE id=p_actor AND email IS NOT NULL AND NOT COALESCE(is_anonymous,false);
 IF NOT FOUND THEN RAISE EXCEPTION 'email_confirmation_required'; END IF;
 PERFORM 1 FROM public.member_profiles WHERE user_id=p_actor AND community_joined_at IS NOT NULL AND NOT suspended FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'community_join_required'; END IF;
 IF p_action='delivered' THEN
  UPDATE public.member_identity_challenges SET delivered_at=now() WHERE user_id=p_actor AND channel=channel_name AND id=(p_payload->>'id')::uuid AND consumed_at IS NULL AND expires_at>now();
  RETURN jsonb_build_object('ok',FOUND);
 END IF;
 IF channel_name='phone' THEN
  destination:=p_payload->>'phone';
  IF destination IS NULL OR destination !~ '^\+55[1-9][0-9]9[0-9]{8}$' OR p_payload->'consent' IS DISTINCT FROM 'true'::jsonb THEN RAISE EXCEPTION 'invalid_phone'; END IF;
 END IF;
 IF p_payload->>'fingerprint' IS NULL OR p_payload->>'fingerprint' !~ '^[a-f0-9]{32}$' THEN RAISE EXCEPTION 'invalid_input'; END IF;
 SELECT * INTO challenge FROM public.member_identity_challenges WHERE user_id=p_actor AND channel=channel_name;
 IF challenge.created_at>now()-interval '60 seconds' THEN RETURN jsonb_build_object('ok',false,'error','identity_rate_limited'); END IF;
 keys:=ARRAY['identity:'||channel_name||':day','identity:'||channel_name||':hour','identity:'||channel_name||':user:'||p_actor::text,'identity:'||channel_name||':destination:'||encode(sha256(convert_to(destination,'UTF8')),'hex'),'identity:ip:'||(p_payload->>'fingerprint')];
 FOR i IN 1..5 LOOP
  INSERT INTO public.newsletter_throttle(fingerprint,attempts,window_started_at) VALUES(keys[i],1,now())
  ON CONFLICT(fingerprint) DO UPDATE SET
   attempts=CASE WHEN public.newsletter_throttle.window_started_at<now()-windows[i] THEN 1 ELSE public.newsletter_throttle.attempts+1 END,
   window_started_at=CASE WHEN public.newsletter_throttle.window_started_at<now()-windows[i] THEN now() ELSE public.newsletter_throttle.window_started_at END
  RETURNING attempts INTO current_attempts;
  IF current_attempts>limits[i] THEN RETURN jsonb_build_object('ok',false,'error','identity_rate_limited'); END IF;
 END LOOP;
 generated_code:=lpad(((('x'||encode(extensions.gen_random_bytes(4),'hex'))::bit(32)::bigint)%1000000)::text,6,'0');
 INSERT INTO public.member_identity_challenges(user_id,channel,id,destination,code_hash,expires_at)
 VALUES(p_actor,channel_name,challenge_id,destination,sha256(convert_to(challenge_id::text||':'||generated_code,'UTF8')),now()+interval '10 minutes')
 ON CONFLICT(user_id,channel) DO UPDATE SET id=EXCLUDED.id,destination=EXCLUDED.destination,code_hash=EXCLUDED.code_hash,expires_at=EXCLUDED.expires_at,attempts=0,created_at=now(),delivered_at=NULL,consumed_at=NULL;
 RETURN jsonb_build_object('ok',true,'id',challenge_id,'destination',destination,'code',generated_code);
END $$;
REVOKE ALL ON FUNCTION public.member_identity_service(text,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_identity_service(text,uuid,jsonb) TO service_role;

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
    IF NOT public.member_identity_verified(actor) THEN RAISE EXCEPTION 'identity_verification_required'; END IF;
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
