-- quiz_leads
CREATE TABLE public.quiz_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- lead
  name TEXT,
  phone TEXT,
  -- origem
  source_url TEXT,
  landing_path TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  device_type TEXT,
  browser TEXT,
  operating_system TEXT,
  -- status
  status TEXT NOT NULL DEFAULT 'incompleto',
  current_step INTEGER NOT NULL DEFAULT 0,
  completion_percentage INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  last_interaction_at TIMESTAMPTZ DEFAULT now(),
  -- respostas estruturadas
  main_use TEXT,
  main_use_label TEXT,
  daily_km_range TEXT,
  daily_km_range_label TEXT,
  route_type TEXT,
  route_type_label TEXT,
  budget_range TEXT,
  budget_range_label TEXT,
  had_ebike_before TEXT,
  had_ebike_before_label TEXT,
  -- clusters
  usage_cluster TEXT,
  distance_cluster TEXT,
  route_cluster TEXT,
  budget_cluster TEXT,
  experience_cluster TEXT,
  intent_cluster TEXT,
  recommendation_profile TEXT,
  -- recomendação
  recommended_bike_1 TEXT,
  recommended_bike_1_label TEXT,
  recommended_bike_1_score NUMERIC,
  recommended_bike_1_reason TEXT,
  recommended_bike_1_link TEXT,
  recommended_bike_2 TEXT,
  recommended_bike_2_label TEXT,
  recommended_bike_2_score NUMERIC,
  recommended_bike_2_reason TEXT,
  recommended_bike_2_link TEXT,
  recommendation_reason TEXT,
  -- conversão
  conversion_status TEXT DEFAULT 'sem_clique',
  clicked_bike_name TEXT,
  clicked_bike_position TEXT,
  clicked_bike_link TEXT,
  clicked_at TIMESTAMPTZ,
  buy_click_count INTEGER NOT NULL DEFAULT 0,
  -- webhook
  crm_webhook_status TEXT,
  last_webhook_sent_at TIMESTAMPTZ,
  webhook_error_message TEXT,
  -- backup
  raw_answers_json JSONB,
  raw_recommendation_json JSONB
);

ALTER TABLE public.quiz_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz leads"
  ON public.quiz_leads FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can update quiz leads"
  ON public.quiz_leads FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- trigger updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  NEW.last_interaction_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quiz_leads_updated_at
  BEFORE UPDATE ON public.quiz_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- quiz_events
CREATE TABLE public.quiz_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lead_id UUID REFERENCES public.quiz_leads(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  step INTEGER,
  field_name TEXT,
  field_value TEXT,
  field_label TEXT,
  payload JSONB
);

ALTER TABLE public.quiz_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert quiz events"
  ON public.quiz_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX idx_quiz_events_lead ON public.quiz_events(lead_id);
CREATE INDEX idx_quiz_leads_status ON public.quiz_leads(status);