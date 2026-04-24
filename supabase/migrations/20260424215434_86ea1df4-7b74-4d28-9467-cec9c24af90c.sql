GRANT USAGE ON SCHEMA public TO anon, authenticated;

GRANT INSERT, UPDATE ON TABLE public.quiz_leads TO anon, authenticated;
GRANT INSERT ON TABLE public.quiz_events TO anon, authenticated;

GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;