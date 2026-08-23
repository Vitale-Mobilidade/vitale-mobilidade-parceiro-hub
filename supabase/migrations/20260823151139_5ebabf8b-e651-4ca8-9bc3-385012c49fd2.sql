-- 1) Tabelas internas de orquestração dos workers
CREATE TABLE public.worker_state (
  worker text PRIMARY KEY,
  status text NOT NULL DEFAULT 'idle',
  paused_reason text,
  resume_at timestamp with time zone,
  running_since timestamp with time zone,
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_run_at timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.worker_state TO service_role;
ALTER TABLE public.worker_state ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER worker_state_updated_at BEFORE UPDATE ON public.worker_state
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.worker_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker text NOT NULL,
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  finished_at timestamp with time zone,
  processed integer NOT NULL DEFAULT 0,
  succeeded integer NOT NULL DEFAULT 0,
  failed integer NOT NULL DEFAULT 0,
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.worker_runs TO service_role;
ALTER TABLE public.worker_runs ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.worker_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  worker text NOT NULL,
  bike_id text,
  event text NOT NULL,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT ALL ON public.worker_events TO service_role;
ALTER TABLE public.worker_events ENABLE ROW LEVEL SECURITY;

-- 2) Dedup de jobs de IA
CREATE UNIQUE INDEX IF NOT EXISTS bike_profile_jobs_bike_hash_key
  ON public.bike_profile_jobs (bike_id, technical_hash);

-- 3) get_quiz_catalog: expõe imageReady e URL persistida quando o asset está pronto
CREATE OR REPLACE FUNCTION public.get_quiz_catalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(x.bike), '[]'::jsonb)
  FROM (
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'id', b->>'id',
      'name', b->>'name',
      'linkVitale', b->>'linkVitale',
      'price', (b->>'price')::numeric,
      'autonomyKm', (b->>'autonomyKm')::int,
      'capacity', (b->>'capacity')::int,
      'description', b->>'description',
      'shortDescription', b->>'shortDescription',
      'image', CASE
        WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url
        WHEN COALESCE((b->>'isNew')::boolean, false) THEN b->>'image'
        ELSE NULL
      END,
      'imageReady', (a.status = 'ready' AND a.public_url IS NOT NULL),
      'weightSupportKg', COALESCE((p.data->>'weightSupportKg')::int, (b->>'weightSupportKg')::int),
      'bestFor', COALESCE(p.data->'bestFor', b->'bestFor'),
      'terrains', COALESCE(p.data->'terrains', b->'terrains'),
      'strengths', COALESCE(p.data->'strengths', b->'strengths'),
      'diferencial', COALESCE(p.data->>'diferencial', b->>'diferencial'),
      'perfilIndicado', COALESCE(p.data->>'perfilIndicado', b->>'perfilIndicado'),
      'isNew', COALESCE((b->>'isNew')::boolean, false),
      'status', 'eligible'
    )) AS bike
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    LEFT JOIN public.bike_assets a ON a.bike_id = b->>'id'
    LEFT JOIN public.bike_profiles p ON p.bike_id = b->>'id' AND p.status = 'ready'
    WHERE s.id = 'current'
      AND COALESCE(b->>'status', 'eligible') <> 'inactive'
      AND COALESCE(o.eligible, false) = true
      AND (
        COALESCE((b->>'isNew')::boolean, false) = false
        OR (a.status = 'ready' AND a.public_url IS NOT NULL AND p.status = 'ready')
      )
  ) x;
$function$;
GRANT EXECUTE ON FUNCTION public.get_quiz_catalog() TO anon, authenticated, service_role;

-- 4) Agendadores dos workers (a cada 15 min, defasados; o horário do catálogo permanece)
select cron.unschedule('bike-image-worker-15min') where exists (select 1 from cron.job where jobname = 'bike-image-worker-15min');
select cron.unschedule('bike-profile-worker-15min') where exists (select 1 from cron.job where jobname = 'bike-profile-worker-15min');

select cron.schedule(
  'bike-image-worker-15min',
  '3,18,33,48 * * * *',
  $$
  select net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-image-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);

select cron.schedule(
  'bike-profile-worker-15min',
  '8,23,38,53 * * * *',
  $$
  select net.http_post(
    url := 'https://ipectfejftfcikvozoyu.supabase.co/functions/v1/bike-profile-worker',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{"source":"cron"}'::jsonb
  );
  $$
);