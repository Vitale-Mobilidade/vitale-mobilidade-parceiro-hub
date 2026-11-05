BEGIN;
-- Public launch authorized 05/11/2026. Keep a reversible gate, distinct from identity/payment.
ALTER TABLE public.member_classifieds_settings
 ADD COLUMN public_enabled boolean NOT NULL DEFAULT false;

-- Historical helper name retained because RPCs and Storage share this gate.
-- Eligibility is not publication: verified contacts, ownership and paid entitlement remain separate.
CREATE OR REPLACE FUNCTION public.member_classifieds_pilot(p_actor uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT COALESCE((SELECT s.enabled AND s.public_enabled AND c.enabled
 FROM public.member_classifieds_settings s CROSS JOIN public.member_community_settings c
 WHERE s.singleton AND c.singleton),false)
 AND EXISTS(SELECT 1 FROM auth.users u JOIN public.member_profiles p ON p.user_id=u.id
 WHERE u.id=p_actor AND NOT COALESCE(u.is_anonymous,false)
 AND p.community_joined_at IS NOT NULL AND NOT p.suspended);
$$;
REVOKE ALL ON FUNCTION public.member_classifieds_pilot(uuid) FROM PUBLIC,anon,authenticated;
UPDATE public.member_classifieds_settings SET public_enabled=true WHERE singleton;
COMMIT;
