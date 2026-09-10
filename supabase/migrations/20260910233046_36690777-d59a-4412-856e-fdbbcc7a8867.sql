CREATE OR REPLACE FUNCTION public.get_price_tracker_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH eligible AS (
    SELECT
      b->>'id' AS id,
      b->>'name' AS name,
      (b->>'price')::numeric AS price,
      b->>'linkVitale' AS link,
      CASE WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url ELSE NULL END AS image
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    LEFT JOIN public.bike_assets a ON a.bike_id = b->>'id'
    WHERE s.id = 'current'
      AND COALESCE(b->>'status', 'eligible') = 'eligible'
      AND COALESCE((b->>'sheetEligible')::boolean, false) = true
      AND COALESCE(o.eligible, false) = true
      AND (b->>'price')::numeric > 0
      AND b->>'linkVitale' LIKE 'https://%'
  ), hist AS (
    SELECT
      h.bike_id,
      min(h.observed_at) AS first_observed_at,
      max(h.observed_at) AS last_observed_at,
      count(*) AS observations,
      min(h.price) AS min_observed,
      max(h.price) AS max_observed,
      jsonb_agg(jsonb_build_object('t', h.observed_at, 'price', h.price, 'source', h.source, 'confidence', h.confidence)
                ORDER BY h.observed_at) AS points
    FROM public.bike_price_history h
    WHERE h.observed_at >= now() - interval '120 days'
    GROUP BY h.bike_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'currentPrice', e.price,
    'link', e.link,
    'image', e.image,
    'points', COALESCE(hist.points, '[]'::jsonb),
    'firstObservedAt', hist.first_observed_at,
    'lastObservedAt', hist.last_observed_at,
    'observations', COALESCE(hist.observations, 0),
    'minObserved', hist.min_observed,
    'maxObserved', hist.max_observed
  ) ORDER BY e.name), '[]'::jsonb)
  FROM eligible e
  LEFT JOIN hist ON hist.bike_id = e.id;
$$;

CREATE OR REPLACE FUNCTION public.get_bike_price_history(p_bike_id text, p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH win AS (
    SELECT CASE WHEN COALESCE(p_days, 30) <= 7 THEN 7
                WHEN COALESCE(p_days, 30) <= 30 THEN 30
                ELSE 90 END AS days
  ), eligible AS (
    SELECT
      b->>'id' AS id,
      b->>'name' AS name,
      (b->>'price')::numeric AS price,
      b->>'linkVitale' AS link,
      CASE WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url ELSE NULL END AS image
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    LEFT JOIN public.bike_assets a ON a.bike_id = b->>'id'
    WHERE s.id = 'current'
      AND b->>'id' = p_bike_id
      AND COALESCE(b->>'status', 'eligible') = 'eligible'
      AND COALESCE((b->>'sheetEligible')::boolean, false) = true
      AND COALESCE(o.eligible, false) = true
      AND (b->>'price')::numeric > 0
      AND b->>'linkVitale' LIKE 'https://%'
    LIMIT 1
  ), agg AS (
    SELECT
      min(h.observed_at) AS first_observed_at,
      max(h.observed_at) AS last_observed_at,
      count(*) AS observations,
      min(h.price) AS min_observed,
      max(h.price) AS max_observed
    FROM public.bike_price_history h
    WHERE h.bike_id = p_bike_id
  ), pts AS (
    SELECT jsonb_agg(jsonb_build_object('t', h.observed_at, 'price', h.price, 'source', h.source, 'confidence', h.confidence)
                     ORDER BY h.observed_at) AS points
    FROM public.bike_price_history h, win
    WHERE h.bike_id = p_bike_id
      AND (
        h.observed_at >= now() - (win.days || ' days')::interval
        OR h.observed_at = (
          SELECT max(h2.observed_at) FROM public.bike_price_history h2
          WHERE h2.bike_id = p_bike_id AND h2.observed_at < now() - (win.days || ' days')::interval
        )
      )
  )
  SELECT CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'currentPrice', e.price,
    'link', e.link,
    'image', e.image,
    'points', COALESCE(pts.points, '[]'::jsonb),
    'firstObservedAt', agg.first_observed_at,
    'lastObservedAt', agg.last_observed_at,
    'observations', COALESCE(agg.observations, 0),
    'minObserved', agg.min_observed,
    'maxObserved', agg.max_observed
  ) END
  FROM eligible e CROSS JOIN agg CROSS JOIN pts;
$$;

REVOKE ALL ON FUNCTION public.get_price_tracker_catalog() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_bike_price_history(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_price_tracker_catalog() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_bike_price_history(text, integer) TO anon, authenticated, service_role;