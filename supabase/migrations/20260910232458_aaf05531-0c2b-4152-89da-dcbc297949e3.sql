CREATE TABLE public.bike_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id text NOT NULL,
  bike_name text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now(),
  price numeric(12,2) NOT NULL CHECK (price > 0),
  link_vitale text,
  eligible boolean NOT NULL DEFAULT true,
  source_run_id uuid REFERENCES public.bike_sync_runs(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'sync'
    CHECK (source IN ('sync','new_baseline','current_baseline','reconstructed_anchor','reconstructed_change','link_change')),
  confidence text NOT NULL DEFAULT 'observed'
    CHECK (confidence IN ('observed','reconstructed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX bike_price_history_bike_observed_key
  ON public.bike_price_history (bike_id, observed_at);
CREATE INDEX bike_price_history_bike_observed_desc
  ON public.bike_price_history (bike_id, observed_at DESC);

GRANT ALL ON public.bike_price_history TO service_role;

ALTER TABLE public.bike_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct price history access"
  ON public.bike_price_history FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.get_price_tracker_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH elig AS (
    SELECT b->>'id' AS bike_id,
           b->>'name' AS name,
           (b->>'price')::numeric AS price,
           b->>'linkVitale' AS link
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    WHERE s.id = 'current'
      AND COALESCE(b->>'status', 'eligible') = 'eligible'
      AND o.eligible = true
      AND COALESCE((b->>'sheetEligible')::boolean, false) = true
      AND (b->>'price')::numeric > 0
      AND b->>'linkVitale' LIKE 'https://%'
  ),
  pts AS (
    SELECT h.bike_id,
           jsonb_agg(jsonb_build_object(
             't', h.observed_at,
             'price', h.price,
             'source', h.source,
             'confidence', h.confidence
           ) ORDER BY h.observed_at) AS points,
           min(h.observed_at) AS first_at,
           max(h.observed_at) AS last_at,
           count(*)::int AS observations,
           min(h.price) AS min_price,
           max(h.price) AS max_price
    FROM public.bike_price_history h
    WHERE h.observed_at >= now() - interval '90 days'
    GROUP BY h.bike_id
  )
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', e.bike_id,
      'name', e.name,
      'currentPrice', e.price,
      'link', e.link,
      'image', CASE WHEN a.status = 'ready' THEN a.public_url ELSE NULL END,
      'points', COALESCE(p.points, '[]'::jsonb),
      'firstObservedAt', p.first_at,
      'lastObservedAt', p.last_at,
      'observations', COALESCE(p.observations, 0),
      'minObserved', p.min_price,
      'maxObserved', p.max_price
    ) AS x
    FROM elig e
    LEFT JOIN pts p ON p.bike_id = e.bike_id
    LEFT JOIN public.bike_assets a ON a.bike_id = e.bike_id
  ) q;
$function$;

CREATE OR REPLACE FUNCTION public.get_bike_price_history(p_bike_id text, p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH win AS (
    SELECT CASE WHEN p_days <= 7 THEN 7 WHEN p_days <= 30 THEN 30 ELSE 90 END AS days
  ),
  bike AS (
    SELECT b->>'id' AS bike_id,
           b->>'name' AS name,
           (b->>'price')::numeric AS price,
           b->>'linkVitale' AS link
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    WHERE s.id = 'current'
      AND b->>'id' = p_bike_id
      AND COALESCE(b->>'status', 'eligible') = 'eligible'
      AND o.eligible = true
      AND COALESCE((b->>'sheetEligible')::boolean, false) = true
      AND (b->>'price')::numeric > 0
      AND b->>'linkVitale' LIKE 'https://%'
  ),
  hist AS (
    SELECT h.observed_at, h.price, h.source, h.confidence
    FROM public.bike_price_history h, win
    WHERE h.bike_id = p_bike_id
      AND h.observed_at >= now() - make_interval(days => win.days)
    UNION ALL
    -- Âncora: último preço vigente ANTES da janela (não cria ponto artificial novo).
    SELECT a.observed_at, a.price, a.source, a.confidence
    FROM win, LATERAL (
      SELECT h2.observed_at, h2.price, h2.source, h2.confidence
      FROM public.bike_price_history h2
      WHERE h2.bike_id = p_bike_id
        AND h2.observed_at < now() - make_interval(days => win.days)
      ORDER BY h2.observed_at DESC
      LIMIT 1
    ) a
  ),
  agg AS (
    SELECT jsonb_agg(jsonb_build_object(
             't', observed_at, 'price', price, 'source', source, 'confidence', confidence
           ) ORDER BY observed_at) AS points
    FROM hist
  ),
  overall AS (
    SELECT min(observed_at) AS first_at, max(observed_at) AS last_at,
           count(*)::int AS observations, min(price) AS min_price, max(price) AS max_price
    FROM public.bike_price_history WHERE bike_id = p_bike_id
  )
  SELECT CASE WHEN bike.bike_id IS NULL THEN 'null'::jsonb ELSE jsonb_build_object(
    'id', bike.bike_id,
    'name', bike.name,
    'currentPrice', bike.price,
    'link', bike.link,
    'image', CASE WHEN a.status = 'ready' THEN a.public_url ELSE NULL END,
    'days', win.days,
    'points', COALESCE(agg.points, '[]'::jsonb),
    'firstObservedAt', overall.first_at,
    'lastObservedAt', overall.last_at,
    'observations', COALESCE(overall.observations, 0),
    'minObserved', overall.min_price,
    'maxObserved', overall.max_price
  ) END
  FROM win
  LEFT JOIN bike ON true
  LEFT JOIN public.bike_assets a ON a.bike_id = bike.bike_id
  LEFT JOIN agg ON true
  LEFT JOIN overall ON true;
$function$;

REVOKE ALL ON FUNCTION public.get_price_tracker_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_bike_price_history(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_price_tracker_catalog() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_bike_price_history(text, int) TO anon, authenticated, service_role;