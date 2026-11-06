BEGIN;
-- Companion: revert Admin directory frontend. Keep publication support for benefits
-- already granted, along with immutable dates, transfers and audit. No data loss.
REVOKE ALL ON FUNCTION public.admin_community_manage(uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
