
ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS fbclid text,
  ADD COLUMN IF NOT EXISTS gclid text,
  ADD COLUMN IF NOT EXISTS first_url text,
  ADD COLUMN IF NOT EXISTS first_seen_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS user_agent text;

CREATE INDEX IF NOT EXISTS idx_quiz_leads_fbclid ON public.quiz_leads (fbclid) WHERE fbclid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quiz_leads_traffic_origin ON public.quiz_leads (traffic_origin);
