CREATE TABLE public.bike_price_daily (
  bike_id text NOT NULL,
  day date NOT NULL,
  close numeric NOT NULL,
  low numeric NOT NULL,
  high numeric NOT NULL,
  verified_runs integer NOT NULL DEFAULT 0,
  last_verified_at timestamptz,
  changed boolean NOT NULL DEFAULT false,
  verification text NOT NULL DEFAULT 'reconstructed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bike_id, day)
);

GRANT ALL ON public.bike_price_daily TO service_role;

ALTER TABLE public.bike_price_daily ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct daily price access"
ON public.bike_price_daily FOR ALL
TO anon, authenticated
USING (false) WITH CHECK (false);

CREATE TRIGGER bike_price_daily_updated_at
BEFORE UPDATE ON public.bike_price_daily
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX bike_price_daily_day_idx ON public.bike_price_daily (day);

-- Backfill conservador: só dias com execução bem-sucedida viram linha.
WITH days AS (
  SELECT generate_series(date '2026-08-27', (now() AT TIME ZONE 'America/Sao_Paulo')::date, interval '1 day')::date AS d
), runs AS (
  SELECT (started_at AT TIME ZONE 'America/Sao_Paulo')::date AS d,
         count(*)::int AS n,
         max(COALESCE(finished_at, started_at)) AS last_at
  FROM public.bike_sync_runs
  WHERE status IN ('ok', 'ok_no_changes')
  GROUP BY 1
), bikes AS (
  SELECT bike_id, min((observed_at AT TIME ZONE 'America/Sao_Paulo')::date) AS first_day
  FROM public.bike_price_history
  GROUP BY bike_id
), grid AS (
  SELECT b.bike_id, d.d, r.n AS verified_runs, r.last_at
  FROM bikes b
  JOIN days d ON d.d >= b.first_day
  JOIN runs r ON r.d = d.d
), ev AS (
  SELECT bike_id,
         (observed_at AT TIME ZONE 'America/Sao_Paulo')::date AS d,
         min(price) AS low, max(price) AS high
  FROM public.bike_price_history
  GROUP BY 1, 2
)
INSERT INTO public.bike_price_daily
  (bike_id, day, close, low, high, verified_runs, last_verified_at, changed, verification)
SELECT g.bike_id,
       g.d,
       c.close,
       LEAST(COALESCE(ev.low, c.close), c.close),
       GREATEST(COALESCE(ev.high, c.close), c.close),
       g.verified_runs,
       g.last_at,
       ev.d IS NOT NULL,
       CASE WHEN ev.d IS NOT NULL THEN 'observed_change' ELSE 'reconstructed' END
FROM grid g
LEFT JOIN ev ON ev.bike_id = g.bike_id AND ev.d = g.d
CROSS JOIN LATERAL (
  SELECT h.price AS close
  FROM public.bike_price_history h
  WHERE h.bike_id = g.bike_id
    AND (h.observed_at AT TIME ZONE 'America/Sao_Paulo')::date <= g.d
  ORDER BY h.observed_at DESC
  LIMIT 1
) c
WHERE c.close > 0
ON CONFLICT (bike_id, day) DO NOTHING;