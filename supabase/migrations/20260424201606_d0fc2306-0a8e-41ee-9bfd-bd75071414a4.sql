DROP POLICY IF EXISTS "Anyone can insert quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Update only in-progress leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Anyone can insert quiz events" ON public.quiz_events;

CREATE POLICY "Public can insert quiz leads"
  ON public.quiz_leads FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Public can update in-progress quiz leads"
  ON public.quiz_leads FOR UPDATE
  TO public
  USING (status IN ('incompleto', 'completo'))
  WITH CHECK (status IN ('incompleto', 'completo', 'enviado_crm', 'erro_webhook'));

CREATE POLICY "Public can insert quiz events"
  ON public.quiz_events FOR INSERT
  TO public
  WITH CHECK (true);