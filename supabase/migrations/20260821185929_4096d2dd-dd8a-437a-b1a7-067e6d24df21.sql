CREATE TABLE public.bike_catalog_snapshot (
  id text PRIMARY KEY DEFAULT 'current',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  content_hash text,
  recognized_count integer NOT NULL DEFAULT 0,
  ignored_count integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bike_catalog_snapshot TO anon, authenticated;
GRANT ALL ON public.bike_catalog_snapshot TO service_role;
ALTER TABLE public.bike_catalog_snapshot ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read bike catalog snapshot"
  ON public.bike_catalog_snapshot FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.bike_catalog_sync_state (
  id text PRIMARY KEY DEFAULT 'current',
  status text NOT NULL DEFAULT 'pending',
  last_attempt_at timestamptz,
  last_success_at timestamptz,
  next_run_at timestamptz NOT NULL DEFAULT now(),
  recognized_count integer NOT NULL DEFAULT 0,
  ignored_count integer NOT NULL DEFAULT 0,
  ignored_rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  error_message text,
  running_since timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.bike_catalog_sync_state TO anon, authenticated;
GRANT ALL ON public.bike_catalog_sync_state TO service_role;
ALTER TABLE public.bike_catalog_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read bike catalog sync state"
  ON public.bike_catalog_sync_state FOR SELECT TO anon, authenticated USING (true);

INSERT INTO public.bike_catalog_snapshot (id) VALUES ('current');
INSERT INTO public.bike_catalog_sync_state (id) VALUES ('current');