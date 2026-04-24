-- Garantir uso do schema public
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grants explícitos nas tabelas do quiz (RLS continua ativo, policies já existem)
GRANT INSERT, UPDATE, SELECT ON public.quiz_leads TO anon, authenticated;
GRANT INSERT, SELECT ON public.quiz_events TO anon, authenticated;