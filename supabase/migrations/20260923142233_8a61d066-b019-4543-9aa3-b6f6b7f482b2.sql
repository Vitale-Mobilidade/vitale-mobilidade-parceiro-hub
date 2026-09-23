-- Radar público desacoplado da elegibilidade do Quiz.
-- Somente substituição de funções de LEITURA existentes. Nenhum INSERT/UPDATE/DELETE,
-- nenhuma mudança de schema, RLS, grants ou writer. get_quiz_catalog() NÃO é tocada.

CREATE OR REPLACE FUNCTION public.get_price_tracker_catalog()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH snap AS (
    SELECT b->>'id' AS id, b AS row
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    WHERE s.id = 'current'
  ),
  base AS (
    SELECT
      bk.bike_id AS id,
      bk.name AS name,
      o.price AS price,
      o.url AS link,
      (o.price IS NOT NULL) AS has_current_offer,
      COALESCE(
        CASE WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url END,
        bk.image_url
      ) AS image,
      COALESCE(p.data->>'shortDescription', sn.row->>'shortDescription', bk.short_description) AS short_description,
      COALESCE(p.data->'strengths', sn.row->'strengths') AS strengths
    FROM public.bikes bk
    LEFT JOIN snap sn ON sn.id = bk.bike_id
    LEFT JOIN public.bike_assets a ON a.bike_id = bk.bike_id
    LEFT JOIN public.bike_profiles p ON p.bike_id = bk.bike_id AND p.status = 'ready'
    LEFT JOIN LATERAL (
      SELECT f.price, f.url
      FROM public.bike_offers f
      WHERE f.bike_id = bk.bike_id
        AND f.is_current
        AND f.ended_at IS NULL
        AND f.price > 0
        AND f.url ~ '^https://meli\.la/[A-Za-z0-9]+$'
      ORDER BY f.synced_at DESC, f.first_seen_at DESC
      LIMIT 1
    ) o ON true
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
    JOIN base e ON e.id = h.bike_id
    GROUP BY h.bike_id
  ),
  last_price AS (
    SELECT DISTINCT ON (h.bike_id) h.bike_id, h.price
    FROM public.bike_price_history h
    JOIN base e ON e.id = h.bike_id
    ORDER BY h.bike_id, h.observed_at DESC
  ),
  anchor AS (
    SELECT DISTINCT ON (h.bike_id) h.bike_id, h.observed_at
    FROM public.bike_price_history h
    JOIN base e ON e.id = h.bike_id
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
    JOIN base e ON e.id = h.bike_id
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
    JOIN base e ON e.id = d.bike_id
    WHERE d.day >= ((now() AT TIME ZONE 'America/Sao_Paulo')::date - 90)
    GROUP BY d.bike_id
  )
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', e.id,
    'name', e.name,
    'hasCurrentOffer', e.has_current_offer,
    'currentPrice', e.price,
    'link', e.link,
    'image', e.image,
    'shortDescription', e.short_description,
    'strengths', COALESCE(e.strengths, '[]'::jsonb),
    'points', COALESCE(pts.points, '[]'::jsonb),
    'daily', COALESCE(daily.series, '[]'::jsonb),
    'firstObservedAt', ov.first_observed_at,
    'lastObservedAt', ov.last_observed_at,
    'lastObservedPrice', lp.price,
    'observations', COALESCE(ov.observations, 0),
    'minObserved', ov.min_observed,
    'maxObserved', ov.max_observed
  ) ORDER BY e.name), '[]'::jsonb)
  FROM base e
  LEFT JOIN overall ov ON ov.bike_id = e.id
  LEFT JOIN last_price lp ON lp.bike_id = e.id
  LEFT JOIN pts ON pts.bike_id = e.id
  LEFT JOIN daily ON daily.bike_id = e.id
  WHERE e.has_current_offer OR ov.bike_id IS NOT NULL;
$function$;

COMMENT ON FUNCTION public.get_price_tracker_catalog() IS
  'Catalogo publico do Radar. Preco/link vem exclusivamente da oferta atual valida em bike_offers (mesma linha). Itens sem oferta atual aparecem com hasCurrentOffer=false, currentPrice/link nulos (historico arquivado). Nao aplica elegibilidade do Quiz.';

CREATE OR REPLACE FUNCTION public.get_bike_price_history(p_bike_id text, p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH win AS (
    SELECT CASE WHEN p_days IS NULL OR p_days <= 0 THEN NULL
                WHEN p_days <= 7 THEN 7
                WHEN p_days <= 30 THEN 30
                ELSE 90 END AS days
  ), snap AS (
    SELECT b AS row
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    WHERE s.id = 'current' AND b->>'id' = p_bike_id
    LIMIT 1
  ), base AS (
    SELECT
      bk.bike_id AS id,
      bk.name AS name,
      o.price AS price,
      o.url AS link,
      (o.price IS NOT NULL) AS has_current_offer,
      COALESCE(
        CASE WHEN a.status = 'ready' AND a.public_url IS NOT NULL THEN a.public_url END,
        bk.image_url
      ) AS image,
      COALESCE(p.data->>'shortDescription', sn.row->>'shortDescription', bk.short_description) AS short_description,
      COALESCE(sn.row->>'description', bk.description) AS description,
      COALESCE(p.data->>'perfilIndicado', sn.row->>'perfilIndicado') AS perfil_indicado,
      COALESCE(p.data->>'diferencial', sn.row->>'diferencial') AS diferencial,
      COALESCE(p.data->'strengths', sn.row->'strengths') AS strengths,
      COALESCE(p.data->'bestFor', sn.row->'bestFor') AS best_for,
      COALESCE(p.data->'terrains', sn.row->'terrains') AS terrains,
      COALESCE((sn.row->>'autonomyKm')::int, bk.autonomy_km::int) AS autonomy_km,
      COALESCE((sn.row->>'capacity')::int, bk.capacity_people::int) AS capacity,
      COALESCE((p.data->>'weightSupportKg')::int, (sn.row->>'weightSupportKg')::int) AS weight_support_kg
    FROM public.bikes bk
    LEFT JOIN snap sn ON true
    LEFT JOIN public.bike_assets a ON a.bike_id = bk.bike_id
    LEFT JOIN public.bike_profiles p ON p.bike_id = bk.bike_id AND p.status = 'ready'
    LEFT JOIN LATERAL (
      SELECT f.price, f.url
      FROM public.bike_offers f
      WHERE f.bike_id = bk.bike_id
        AND f.is_current
        AND f.ended_at IS NULL
        AND f.price > 0
        AND f.url ~ '^https://meli\.la/[A-Za-z0-9]+$'
      ORDER BY f.synced_at DESC, f.first_seen_at DESC
      LIMIT 1
    ) o ON true
    WHERE bk.bike_id = p_bike_id
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
  ), last_price AS (
    SELECT h.price
    FROM public.bike_price_history h
    WHERE h.bike_id = p_bike_id
    ORDER BY h.observed_at DESC
    LIMIT 1
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
    'hasCurrentOffer', e.has_current_offer,
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
    'lastObservedPrice', (SELECT price FROM last_price),
    'observations', COALESCE(agg.observations, 0),
    'minObserved', agg.min_observed,
    'maxObserved', agg.max_observed
  )) END
  FROM base e CROSS JOIN agg CROSS JOIN pts CROSS JOIN daily;
$function$;

COMMENT ON FUNCTION public.get_bike_price_history(text, integer) IS
  'Detalhe publico do Radar por bike_id. Preco/link so da oferta atual valida (mesma linha de bike_offers); sem oferta, hasCurrentOffer=false e currentPrice/link nulos (historico arquivado). Nao aplica elegibilidade do Quiz.';