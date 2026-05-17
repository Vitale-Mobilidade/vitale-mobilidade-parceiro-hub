ALTER TABLE public.quiz_leads
  ADD COLUMN IF NOT EXISTS rider_capacity_need TEXT,
  ADD COLUMN IF NOT EXISTS rider_capacity_need_label TEXT,
  ADD COLUMN IF NOT EXISTS weight_range TEXT,
  ADD COLUMN IF NOT EXISTS weight_range_label TEXT,
  ADD COLUMN IF NOT EXISTS passenger_cluster TEXT,
  ADD COLUMN IF NOT EXISTS weight_cluster TEXT;