BEGIN;
CREATE OR REPLACE FUNCTION public.public_video_catalog()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'videoId',youtube_id,'title',title,'date',published_on,
  'url',youtube_url,'thumbnail',thumbnail_url,
  'bikeIds',array_remove(ARRAY[primary_bike_id] || coalesce(related_bike_ids,ARRAY[]::text[]),NULL),
  'unmatched',ARRAY[]::text[]
 ) ORDER BY published_on DESC NULLS LAST,youtube_id), '[]'::jsonb)
 FROM public.editorial_videos WHERE status='active';
$$;
REVOKE ALL ON FUNCTION public.public_video_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_video_catalog() TO anon,authenticated,service_role;
COMMIT;
