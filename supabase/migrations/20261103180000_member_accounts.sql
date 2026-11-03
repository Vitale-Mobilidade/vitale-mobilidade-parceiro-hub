-- Additive only. Local preparation; apply/activate separately with explicit approval.
BEGIN;

CREATE TABLE public.member_community_settings (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  enabled boolean NOT NULL DEFAULT false
);
INSERT INTO public.member_community_settings(singleton) VALUES (true);

CREATE TABLE public.member_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL CHECK (char_length(btrim(display_name)) BETWEEN 2 AND 60),
  privacy_version text NOT NULL DEFAULT '2026-11-03',
  privacy_acknowledged_at timestamptz NOT NULL DEFAULT now(),
  suspended boolean NOT NULL DEFAULT false,
  last_comment_at timestamptz,
  comment_day date,
  comment_day_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.member_article_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id uuid NOT NULL REFERENCES public.editorial_articles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.member_profiles(user_id) ON DELETE CASCADE,
  author_name text NOT NULL CHECK (char_length(btrim(author_name)) BETWEEN 2 AND 60),
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 3 AND 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  moderated_at timestamptz,
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX member_comments_article_idx ON public.member_article_comments(article_id, created_at DESC, id DESC);
CREATE INDEX member_comments_queue_idx ON public.member_article_comments(status, created_at DESC, id DESC);
CREATE INDEX member_comments_user_idx ON public.member_article_comments(user_id);
CREATE TABLE public.member_moderation_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- No direct browser access, including authenticated readers/admins. Definer RPC
-- checks every action. RLS also protects accidental grants in a future migration.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['member_community_settings','member_profiles','member_article_comments','member_moderation_audit'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM PUBLIC, anon, authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
REVOKE ALL ON SEQUENCE public.member_moderation_audit_id_seq FROM PUBLIC, anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.member_moderation_audit_id_seq TO service_role;

CREATE FUNCTION public.member_community(p_action text, p_payload jsonb DEFAULT '{}'::jsonb)
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
