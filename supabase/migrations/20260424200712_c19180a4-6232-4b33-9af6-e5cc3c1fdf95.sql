-- Fix function search_path
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_interaction_at = now();
  RETURN NEW;
END;
$$;

-- Tighten update policy: only allow updates while lead is still in progress
DROP POLICY "Anyone can update quiz leads" ON public.quiz_leads;

CREATE POLICY "Update only in-progress leads"
  ON public.quiz_leads FOR UPDATE
  TO anon, authenticated
  USING (status IN ('incompleto', 'completo'))
  WITH CHECK (status IN ('incompleto', 'completo', 'enviado_crm', 'erro_webhook'));