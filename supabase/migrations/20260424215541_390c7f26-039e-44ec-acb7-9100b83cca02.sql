DROP POLICY IF EXISTS quiz_leads_insert_public ON public.quiz_leads;
DROP POLICY IF EXISTS quiz_leads_update_public ON public.quiz_leads;
DROP POLICY IF EXISTS quiz_events_insert_public ON public.quiz_events;

REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_leads FROM anon, authenticated;
REVOKE SELECT, INSERT, UPDATE, DELETE ON TABLE public.quiz_events FROM anon, authenticated;