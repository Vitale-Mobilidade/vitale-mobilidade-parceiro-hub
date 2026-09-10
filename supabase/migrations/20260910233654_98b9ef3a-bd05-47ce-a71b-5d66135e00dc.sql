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
  ),
  -- Métricas históricas SEMPRE sobre todo o histórico da bike.
  overall AS (
    SELECT
      h.bike_id,
      min(h.observed_at) AS first_observed_at,
      max(h.observed_at) AS last_observed_at,
      count(*) AS observations,
      min(h.price) AS min_observed,
      max(h.price) AS max_observed
    FROM public.bike_price_history h
    JOIN eligible e ON e.id = h.bike_id
    GROUP BY h.bike_id
  ),
  -- Última âncora anterior à janela: preserva o preço vigente no início dela.
  anchor AS (
    SELECT DISTINCT ON (h.bike_id) h.bike_id, h.observed_at
    FROM public.bike_price_history h
    JOIN eligible e ON e.id = h.bike_id
    WHERE h.observed_at < now() - interval '90 days'
    ORDER BY h.bike_id, h.observed_at DESC
  ),
  pts AS (
    SELECT
      h.bike_id,
      jsonb_agg(jsonb_build_object(
        't', h.observed_at,
        'price', h.price,
        'source', h.source,
        'confidence', h.confidence
      ) ORDER BY h.observed_at) AS points
    FROM public.bike_price_history h
    JOIN eligible e ON e.id = h.bike_id
    LEFT JOIN anchor an ON an.bike_id = h.bike_id
    WHERE h.observed_at >= now() - interval '90 days'
       OR h.observed_at = an.observed_at
    GROUP BY h.bike_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'currentPrice', e.price,
    'link', e.link,
    'image', e.image,
    'points', COALESCE(pts.points, '[]'::jsonb),
    'firstObservedAt', ov.first_observed_at,
    'lastObservedAt', ov.last_observed_at,
    'observations', COALESCE(ov.observations, 0),
    'minObserved', ov.min_observed,
    'maxObserved', ov.max_observed
  ) ORDER BY e.name), '[]'::jsonb)
  FROM eligible e
  LEFT JOIN overall ov ON ov.bike_id = e.id
  LEFT JOIN pts ON pts.bike_id = e.id;
$$;

REVOKE ALL ON FUNCTION public.get_price_tracker_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_price_tracker_catalog() TO anon, authenticated, service_role;