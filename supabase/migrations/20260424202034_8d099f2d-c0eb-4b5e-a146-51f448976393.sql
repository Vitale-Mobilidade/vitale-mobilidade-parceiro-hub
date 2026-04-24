DROP POLICY IF EXISTS "Public can insert quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Public can update in-progress quiz leads" ON public.quiz_leads;
DROP POLICY IF EXISTS "Public can insert quiz events" ON public.quiz_events;

CREATE POLICY "Anon can insert quiz leads"
ON public.quiz_leads FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Anon can update in-progress quiz leads"
ON public.quiz_leads FOR UPDATE
TO anon, authenticated
USING (status = ANY (ARRAY['incompleto'::text, 'completo'::text]))
WITH CHECK (status = ANY (ARRAY['incompleto'::text, 'completo'::text, 'enviado_crm'::text, 'erro_webhook'::text]));

CREATE POLICY "Anon can insert quiz events"
ON public.quiz_events FOR INSERT
TO anon, authenticated
WITH CHECK (true);