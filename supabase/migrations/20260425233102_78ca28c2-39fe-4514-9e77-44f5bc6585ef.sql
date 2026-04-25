ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS referrer_domain text,
  ADD COLUMN IF NOT EXISTS detected_source text,
  ADD COLUMN IF NOT EXISTS detected_medium text,
  ADD COLUMN IF NOT EXISTS traffic_origin text;