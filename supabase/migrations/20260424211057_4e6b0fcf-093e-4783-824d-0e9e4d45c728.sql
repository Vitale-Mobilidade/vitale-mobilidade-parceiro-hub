
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT INSERT ON TABLE public.quiz_leads TO anon;
GRANT UPDATE ON TABLE public.quiz_leads TO anon;
GRANT SELECT ON TABLE public.quiz_leads TO anon;
GRANT INSERT ON TABLE public.quiz_leads TO authenticated;
GRANT UPDATE ON TABLE public.quiz_leads TO authenticated;
GRANT SELECT ON TABLE public.quiz_leads TO authenticated;
GRANT INSERT ON TABLE public.quiz_events TO anon;
GRANT SELECT ON TABLE public.quiz_events TO anon;
GRANT INSERT ON TABLE public.quiz_events TO authenticated;
GRANT SELECT ON TABLE public.quiz_events TO authenticated;
