
-- Garantir grants básicos para anon e authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT INSERT, UPDATE, SELECT ON public.quiz_leads TO anon, authenticated;
GRANT INSERT, SELECT ON public.quiz_events TO anon, authenticated;

-- Policies definitivas (drop e recriar limpas)
DROP POLICY IF EXISTS "Anon can insert quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Anon can update in-progress quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Public can insert quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Public can update in-progress quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Anon can insert quiz events" ON public.quiz_events;
DROP POLICY IF EXISTS "Public can insert quiz events" ON public.quiz_events;

CREATE POLICY "quiz_leads_insert_public"
  ON public.quiz_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "quiz_leads_update_public"
  ON public.quiz_leads FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "quiz_events_insert_public"
  ON public.quiz_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Colunas de controle de abandono
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS abandonment_webhook_sent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
