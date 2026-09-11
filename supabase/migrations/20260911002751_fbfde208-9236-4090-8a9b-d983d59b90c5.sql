INSERT INTO public.bike_profile_jobs (bike_id, technical_hash, status, attempts, payload)
SELECT p.bike_id,
       p.technical_hash,
       'queued',
       0,
       jsonb_build_object(
         'name', b->>'name',
         'description', b->>'description',
         'shortDescription', b->>'shortDescription',
         'capacity', (b->>'capacity')::int,
         'autonomyKm', (b->>'autonomyKm')::int
       )
FROM public.bike_catalog_snapshot s
CROSS JOIN LATERAL jsonb_array_elements(s.data->'bikes') b
JOIN public.bike_profiles p ON p.bike_id = b->>'id'
LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
WHERE s.id = 'current'
  AND p.status = 'baseline'
  AND COALESCE(b->>'status','eligible') = 'eligible'
  AND COALESCE((b->>'sheetEligible')::boolean, false) = true
  AND COALESCE(o.eligible, false) = true
  AND (b->>'price')::numeric > 0
  AND b->>'linkVitale' LIKE 'https://%'
  AND NOT EXISTS (
    SELECT 1 FROM public.bike_profile_jobs j
    WHERE j.bike_id = p.bike_id AND j.technical_hash = p.technical_hash AND j.status IN ('queued','processing')
  );