ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS purchase_link_used text,
  ADD COLUMN IF NOT EXISTS link_group_used text,
  ADD COLUMN IF NOT EXISTS bike_model_clicked text;