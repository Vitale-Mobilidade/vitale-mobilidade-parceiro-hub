CREATE OR REPLACE FUNCTION public.get_price_tracker_catalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH eligible AS (
    SELECT
      b->>'id' AS id,
      b->>'name' AS name,
      (b->>'price')::numeric AS price,
      b->>'linkVitale' AS link,
      CASE WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url ELSE NULL END AS image,
      COALESCE(p.data->>'shortDescription', b->>'shortDescription') AS short_description,
      COALESCE(p.data->'strengths', b->'strengths') AS strengths
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    LEFT JOIN public.bike_assets a ON a.bike_id = b->>'id'
    LEFT JOIN public.bike_profiles p ON p.bike_id = b->>'id' AND p.status = 'ready'
    WHERE s.id = 'current'
      AND COALESCE(b->>'status', 'eligible') = 'eligible'
      AND COALESCE((b->>'sheetEligible')::boolean, false) = true
      AND COALESCE(o.eligible, false) = true
      AND (b->>'price')::numeric > 0
      AND b->>'linkVitale' LIKE 'https://%'
  ),
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
  ),
  daily AS (
    SELECT
      d.bike_id,
      jsonb_agg(jsonb_build_object(
        'date', d.day,
        'close', d.close,
        'low', d.low,
        'high', d.high,
        'verifiedRuns', d.verified_runs,
        'lastVerifiedAt', d.last_verified_at,
        'changed', d.changed,
        'verification', d.verification
      ) ORDER BY d.day) AS series
    FROM public.bike_price_daily d
    JOIN eligible e ON e.id = d.bike_id
    WHERE d.day >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - 90)
    GROUP BY d.bike_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'currentPrice', e.price,
    'link', e.link,
    'image', e.image,
    'shortDescription', e.short_description,
    'strengths', COALESCE(e.strengths, '[]'::jsonb),
    'points', COALESCE(pts.points, '[]'::jsonb),
    'daily', COALESCE(daily.series, '[]'::jsonb),
    'firstObservedAt', ov.first_observed_at,
    'lastObservedAt', ov.last_observed_at,
    'observations', COALESCE(ov.observations, 0),
    'minObserved', ov.min_observed,
    'maxObserved', ov.max_observed
  ) ORDER BY e.name), '[]'::jsonb)
  FROM eligible e
  LEFT JOIN overall ov ON ov.bike_id = e.id
  LEFT JOIN pts ON pts.bike_id = e.id
  LEFT JOIN daily ON daily.bike_id = e.id;
$function$;

CREATE OR REPLACE FUNCTION public.get_bike_price_history(p_bike_id text, p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH win AS (
    SELECT CASE WHEN p_days IS NULL OR p_days <= 0 THEN NULL
                WHEN p_days <= 7 THEN 7
                WHEN p_days <= 30 THEN 30
                ELSE 90 END AS days
  ), eligible AS (
    SELECT
      b->>'id' AS id,
      b->>'name' AS name,
      (b->>'price')::numeric AS price,
      b->>'linkVitale' AS link,
      CASE WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url ELSE NULL END AS image,
      COALESCE(p.data->>'shortDescription', b->>'shortDescription') AS short_description,
      b->>'description' AS description,
      COALESCE(p.data->>'perfilIndicado', b->>'perfilIndicado') AS perfil_indicado,
      COALESCE(p.data->>'diferencial', b->>'diferencial') AS diferencial,
      COALESCE(p.data->'strengths', b->'strengths') AS strengths,
      COALESCE(p.data->'bestFor', b->'bestFor') AS best_for,
      COALESCE(p.data->'terrains', b->'terrains') AS terrains,
      (b->>'autonomyKm')::int AS autonomy_km,
      (b->>'capacity')::int AS capacity,
      COALESCE((p.data->>'weightSupportKg')::int, (b->>'weightSupportKg')::int) AS weight_support_kg
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    LEFT JOIN public.bike_assets a ON a.bike_id = b->>'id'
    LEFT JOIN public.bike_profiles p ON p.bike_id = b->>'id' AND p.status = 'ready'
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
        win.days IS NULL
        OR h.observed_at >= now() - (win.days || ' days')::interval
        OR h.observed_at = (
          SELECT max(h2.observed_at) FROM public.bike_price_history h2
          WHERE h2.bike_id = p_bike_id AND h2.observed_at < now() - (win.days || ' days')::interval
        )
      )
  ), daily AS (
    SELECT jsonb_agg(jsonb_build_object(
      'date', d.day,
      'close', d.close,
      'low', d.low,
      'high', d.high,
      'verifiedRuns', d.verified_runs,
      'lastVerifiedAt', d.last_verified_at,
      'changed', d.changed,
      'verification', d.verification
    ) ORDER BY d.day) AS series
    FROM public.bike_price_daily d
    WHERE d.bike_id = p_bike_id
  )
  SELECT CASE WHEN e.id IS NULL THEN NULL ELSE jsonb_strip_nulls(jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'currentPrice', e.price,
    'link', e.link,
    'image', e.image,
    'shortDescription', e.short_description,
    'description', e.description,
    'perfilIndicado', e.perfil_indicado,
    'diferencial', e.diferencial,
    'strengths', e.strengths,
    'bestFor', e.best_for,
    'terrains', e.terrains,
    'autonomyKm', e.autonomy_km,
    'capacity', e.capacity,
    'weightSupportKg', e.weight_support_kg,
    'points', COALESCE(pts.points, '[]'::jsonb),
    'daily', COALESCE(daily.series, '[]'::jsonb),
    'firstObservedAt', agg.first_observed_at,
    'lastObservedAt', agg.last_observed_at,
    'observations', COALESCE(agg.observations, 0),
    'minObserved', agg.min_observed,
    'maxObserved', agg.max_observed
  )) END
  FROM eligible e CROSS JOIN agg CROSS JOIN pts CROSS JOIN daily;
$function$;