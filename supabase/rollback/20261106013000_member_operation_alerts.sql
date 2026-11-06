BEGIN;
UPDATE public.member_operation_alert_settings SET enabled=false WHERE singleton;
DROP TRIGGER IF EXISTS member_operation_alert_registration ON public.member_profiles;
DROP TRIGGER IF EXISTS member_operation_alert_publication ON public.member_bike_listings;
REVOKE ALL ON FUNCTION public.member_operation_alert_claim(),public.member_operation_alert_finish(uuid,uuid,text,text),public.member_operation_alert_prepare(uuid,uuid,text) FROM PUBLIC,anon,authenticated,service_role;
NOTIFY pgrst,'reload schema';
COMMIT;
