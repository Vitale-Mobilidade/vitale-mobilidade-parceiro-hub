
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS webhook_status text,
  ADD COLUMN IF NOT EXISTS webhook_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS webhook_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_last_attempt_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_last_error text,
  ADD COLUMN IF NOT EXISTS webhook_last_response text;

CREATE INDEX IF NOT EXISTS idx_quiz_leads_webhook_status ON public.quiz_leads(webhook_status);
CREATE INDEX IF NOT EXISTS idx_quiz_leads_reprocess
  ON public.quiz_leads(webhook_status, webhook_attempts)
  WHERE webhook_status IN ('pending','failed') AND name IS NOT NULL AND phone IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.integration_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid REFERENCES public.quiz_leads(id) ON DELETE SET NULL,
  event_name text NOT NULL,
  destination text NOT NULL,
  status text NOT NULL,
  http_status integer,
  attempt integer,
  request_payload jsonb,
  response_payload text,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.integration_logs TO service_role;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct integration_logs reads"
  ON public.integration_logs FOR SELECT TO anon, authenticated USING (false);
CREATE POLICY "No direct integration_logs writes"
  ON public.integration_logs FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

CREATE INDEX IF NOT EXISTS idx_integration_logs_lead ON public.integration_logs(lead_id);
CREATE INDEX IF NOT EXISTS idx_integration_logs_status_created ON public.integration_logs(status, created_at DESC);
