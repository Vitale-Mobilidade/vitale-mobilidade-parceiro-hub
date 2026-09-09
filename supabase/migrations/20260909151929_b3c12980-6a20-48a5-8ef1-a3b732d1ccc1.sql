ALTER TABLE public.bike_assets
  ADD COLUMN IF NOT EXISTS source_kind text NOT NULL DEFAULT 'image';

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
      -- Somente linhas completas da planilha (pendências preservadas ficam de fora).
      AND COALESCE(b->>'status', 'eligible') = 'eligible'
      -- Status oficial da planilha, espelhado em overrides.
      AND COALESCE(o.eligible, false) = true
      AND (
        COALESCE((b->>'isNew')::boolean, false) = false
        OR (a.status = 'ready' AND a.public_url IS NOT NULL AND p.status = 'ready')
      )
  ) x;
$function$;