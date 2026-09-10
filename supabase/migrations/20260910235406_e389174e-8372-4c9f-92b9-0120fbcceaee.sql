CREATE TABLE public.bike_price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id text NOT NULL,
  bike_name text NOT NULL,
  person_name text NOT NULL,
  phone_e164 text NOT NULL,
  condition text NOT NULL DEFAULT 'any_drop',
  target_price numeric,
  reference_price numeric NOT NULL,
  status text NOT NULL DEFAULT 'active',
  delivery_enabled boolean NOT NULL DEFAULT false,
  consent boolean NOT NULL DEFAULT false,
  consent_text text NOT NULL,
  consent_version text NOT NULL DEFAULT 'v1',
  consent_at timestamptz NOT NULL DEFAULT now(),
  source_url text,
  traffic_origin text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bike_price_alerts TO service_role;

ALTER TABLE public.bike_price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct price alert access"
ON public.bike_price_alerts FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER bike_price_alerts_updated_at
BEFORE UPDATE ON public.bike_price_alerts
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE UNIQUE INDEX bike_price_alerts_active_uniq
ON public.bike_price_alerts (phone_e164, bike_id)
WHERE status = 'active';

CREATE TABLE public.bike_price_alert_throttle (
  fingerprint text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bike_price_alert_throttle TO service_role;

ALTER TABLE public.bike_price_alert_throttle ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct throttle access"
ON public.bike_price_alert_throttle FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);