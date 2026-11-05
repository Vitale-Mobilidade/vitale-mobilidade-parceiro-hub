BEGIN;
-- Only Auth's server-managed provider identity proves an email. User-editable metadata never does.
CREATE FUNCTION public.member_google_email() RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE actor uuid:=auth.uid(); address text; confirmed timestamptz;
BEGIN
 IF NOT COALESCE((SELECT enabled FROM public.member_community_settings WHERE singleton),false) THEN RAISE EXCEPTION 'community_disabled'; END IF;
 PERFORM 1 FROM public.member_profiles WHERE user_id=actor AND community_joined_at IS NOT NULL AND NOT suspended FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'community_join_required'; END IF;
 SELECT lower(btrim(u.email)),u.email_confirmed_at INTO address,confirmed
 FROM auth.users u WHERE u.id=actor AND NOT COALESCE(u.is_anonymous,false) AND u.email_confirmed_at IS NOT NULL
 AND EXISTS(SELECT 1 FROM auth.identities i WHERE i.user_id=u.id AND i.provider='google'
  AND lower(btrim(i.identity_data->>'email'))=lower(btrim(u.email))
  AND i.identity_data->>'email_verified'='true');
 IF NOT FOUND THEN RETURN jsonb_build_object('emailVerified',false); END IF;
 INSERT INTO public.member_identity_verifications(user_id,email_address,email_verified_at)
 VALUES(actor,address,greatest(now(),confirmed)) ON CONFLICT(user_id) DO UPDATE SET email_address=excluded.email_address,email_verified_at=excluded.email_verified_at,updated_at=now();
 RETURN jsonb_build_object('emailVerified',true);
END $$;
REVOKE ALL ON FUNCTION public.member_google_email() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.member_google_email() TO authenticated;
-- Existing email signup is auto-confirmed by Auth, but possession is proved separately.
-- Do not auto-link a Google identity onto a pre-created password account until that
-- account has a real email proof; otherwise its old password could remain known to a third party.
CREATE FUNCTION public.member_google_link_guard() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 IF NEW.provider='google' AND EXISTS(SELECT 1 FROM auth.users u WHERE u.id=NEW.user_id AND COALESCE(u.encrypted_password,'')<>'')
 AND NOT EXISTS(SELECT 1 FROM public.member_identity_verifications v JOIN auth.users u ON u.id=v.user_id
  WHERE v.user_id=NEW.user_id AND v.email_address=lower(btrim(u.email)) AND v.email_verified_at IS NOT NULL
  AND v.email_verified_at>=COALESCE(u.email_confirmed_at,u.created_at)) THEN
  RAISE EXCEPTION 'google_link_requires_verified_email' USING ERRCODE='28000';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.member_google_link_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER member_google_link_guard BEFORE INSERT OR UPDATE OF user_id,provider,identity_data ON auth.identities
 FOR EACH ROW EXECUTE FUNCTION public.member_google_link_guard();
COMMIT;
