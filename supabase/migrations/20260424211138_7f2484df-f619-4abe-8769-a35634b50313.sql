
DO $$
BEGIN
  EXECUTE 'GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role';
  EXECUTE 'GRANT ALL ON public.quiz_leads TO anon, authenticated, service_role';
  EXECUTE 'GRANT ALL ON public.quiz_events TO anon, authenticated, service_role';
END $$;

NOTIFY pgrst, 'reload schema';
