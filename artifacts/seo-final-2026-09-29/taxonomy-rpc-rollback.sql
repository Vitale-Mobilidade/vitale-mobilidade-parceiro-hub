-- Prepared rollback of the public classification field only.
-- Read-only public projection: expose the existing editorial classification.
-- No new table, writer, RLS policy, price or article URL change.
CREATE OR REPLACE FUNCTION public.get_published_editorial_index()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'slug', slug, 'title', title, 'summary', summary,
    'ogImageUrl', og_image_url, 'publishedAt', published_at,
    'primaryBikeId', primary_bike_id, 'relatedBikeIds', related_bike_ids
  ) ORDER BY published_at DESC), '[]'::jsonb)
  FROM public.editorial_articles
  WHERE status = 'published' AND indexable = true;
$$;
REVOKE ALL ON FUNCTION public.get_published_editorial_index() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_editorial_index() TO anon, authenticated, service_role;
