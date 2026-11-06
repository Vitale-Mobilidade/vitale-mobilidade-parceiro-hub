BEGIN;
-- Code rollback uses legacy metrics; remove access to the new period endpoint.
REVOKE ALL ON FUNCTION public.admin_member_period_metrics(uuid,text,date,date) FROM service_role;
CREATE OR REPLACE FUNCTION public.admin_community_manage(p_actor uuid,p_action text,p_payload jsonb DEFAULT '{}') RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
 RETURN public.admin_community_manage_before_workspace(p_actor,p_action,p_payload);
END $$;
-- Preserve removals (including suspended access), financial references and first-publication evidence.
NOTIFY pgrst,'reload schema';
COMMIT;
