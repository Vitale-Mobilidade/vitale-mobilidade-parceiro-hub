CREATE FUNCTION public.import_podcast_video_audio(
  p_youtube_id text, p_actor uuid, p_upload_id uuid, p_file_name text, p_size integer
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_path text := p_youtube_id || '/' || p_actor || '/' || p_upload_id || '.mp3';
  v_created timestamptz;
  v_result public.podcast_video_audio;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.editorial_admin_memberships
    WHERE user_id = p_actor AND active AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'podcast_audio_forbidden';
  END IF;
  SELECT o.created_at INTO v_created FROM storage.objects AS o
  WHERE o.bucket_id = 'podcast-audio' AND o.name = v_path
    AND o.metadata->>'mimetype' = 'audio/mpeg'
    AND o.metadata->>'size' = p_size::text;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'podcast_audio_not_uploaded';
  END IF;

  INSERT INTO public.podcast_video_audio AS current_audio
    (youtube_id, upload_id, object_path, file_name, size_bytes, uploaded_at, attached_by)
  VALUES (p_youtube_id, p_upload_id, v_path, p_file_name, p_size, v_created, p_actor)
  ON CONFLICT (youtube_id) DO NOTHING
  RETURNING * INTO v_result;
  IF NOT FOUND THEN
    SELECT * INTO STRICT v_result FROM public.podcast_video_audio WHERE youtube_id = p_youtube_id;
  END IF;
  RETURN jsonb_build_object(
    'upload_id', v_result.upload_id,
    'file_name', v_result.file_name,
    'size_bytes', v_result.size_bytes
  );
END $$;

REVOKE ALL ON FUNCTION public.import_podcast_video_audio(text, uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.import_podcast_video_audio(text, uuid, uuid, text, integer)
  TO service_role;
