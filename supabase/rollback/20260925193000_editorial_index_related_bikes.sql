-- Snapshot de pg_get_functiondef em produção antes da migration de 25/09/2026.
-- Restaurar apenas se a projeção de relatedBikeIds causar regressão.
CREATE OR REPLACE FUNCTION public.get_published_editorial_index()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', id, 'slug', slug, 'title', title, 'summary', summary,
    'ogImageUrl', og_image_url, 'publishedAt', published_at,
    'primaryBikeId', primary_bike_id
  ) ORDER BY published_at DESC), '[]'::jsonb)
  FROM public.editorial_articles WHERE status = 'published' AND indexable = true;
$function$;
