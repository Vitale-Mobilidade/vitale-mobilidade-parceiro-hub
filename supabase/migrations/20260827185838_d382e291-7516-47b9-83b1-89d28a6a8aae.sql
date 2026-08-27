-- 1) Histórico de execuções de sincronização
CREATE TABLE IF NOT EXISTS public.bike_sync_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origin text NOT NULL DEFAULT 'auto',
  scheduled_for timestamptz,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  duration_ms integer,
  recognized_count integer,
  ignored_count integer,
  snapshot_written boolean NOT NULL DEFAULT false,
  changed_bikes integer NOT NULL DEFAULT 0,
  changed_fields integer NOT NULL DEFAULT 0,
  error_message text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bike_sync_runs TO service_role;
ALTER TABLE public.bike_sync_runs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS bike_sync_runs_started_idx ON public.bike_sync_runs (started_at DESC);
CREATE INDEX IF NOT EXISTS bike_sync_runs_status_idx ON public.bike_sync_runs (status);
CREATE INDEX IF NOT EXISTS bike_sync_runs_origin_idx ON public.bike_sync_runs (origin);

-- 2) Diff por bike
CREATE TABLE IF NOT EXISTS public.bike_sync_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.bike_sync_runs(id) ON DELETE CASCADE,
  bike_id text NOT NULL,
  bike_name text,
  change_type text NOT NULL,
  field text,
  field_label text,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.bike_sync_changes TO service_role;
ALTER TABLE public.bike_sync_changes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS bike_sync_changes_run_idx ON public.bike_sync_changes (run_id);
CREATE INDEX IF NOT EXISTS bike_sync_changes_bike_idx ON public.bike_sync_changes (bike_id);

DROP TRIGGER IF EXISTS bike_sync_runs_updated_at ON public.bike_sync_runs;
CREATE TRIGGER bike_sync_runs_updated_at
BEFORE UPDATE ON public.bike_sync_runs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3) Relógio fixo do cron: próximo HH:07 America/Sao_Paulo, recalculado
--    somente quando há uma conclusão bem-sucedida NOVA (manual não adia a automática).
CREATE OR REPLACE FUNCTION public.normalize_bike_sync_next_run()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  ts timestamptz;
  candidate timestamptz;
BEGIN
  IF new.last_success_at IS NULL THEN
    RETURN new;
  END IF;

  IF TG_OP = 'UPDATE'
     AND old.last_success_at IS NOT DISTINCT FROM new.last_success_at THEN
    -- Nenhuma conclusão nova (ex.: erro/retry): preserva o next_run_at informado.
    RETURN new;
  END IF;

  ts := new.last_success_at;
  candidate := date_trunc('hour', ts AT TIME ZONE 'America/Sao_Paulo')
               + interval '7 minutes';
  -- Tolerância: conclusões dentro do próprio minuto :07 não repetem o slot.
  WHILE (candidate AT TIME ZONE 'America/Sao_Paulo') <= ts + interval '30 seconds' LOOP
    candidate := candidate + interval '1 hour';
  END LOOP;

  new.next_run_at := candidate AT TIME ZONE 'America/Sao_Paulo';
  RETURN new;
END;
$function$;

DROP TRIGGER IF EXISTS trg_normalize_bike_sync_next_run ON public.bike_catalog_sync_state;
CREATE TRIGGER trg_normalize_bike_sync_next_run
BEFORE INSERT OR UPDATE ON public.bike_catalog_sync_state
FOR EACH ROW EXECUTE FUNCTION public.normalize_bike_sync_next_run();