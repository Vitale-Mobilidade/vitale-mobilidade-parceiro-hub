-- Exposes the already-curated article/bike relations to public read loaders.
-- No table, policy or write path changes: this only extends the published index payload.
CREATE OR REPLACE FUNCTION public.get_published_editorial_index()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id,
    'slug', slug,
    'title', title,
    'summary', summary,
    'ogImageUrl', og_image_url,
    'publishedAt', published_at,
    'primaryBikeId', primary_bike_id,
    'relatedBikeIds', related_bike_ids
  ) ORDER BY published_at DESC), '[]'::jsonb)
  FROM public.editorial_articles
  WHERE status = 'published' AND indexable = true;
$$;

REVOKE ALL ON FUNCTION public.get_published_editorial_index() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_published_editorial_index() TO anon, authenticated, service_role;
