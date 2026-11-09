-- Provision the private bucket through the Lovable Storage UI/API first.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'podcast-audio' AND public IS FALSE
      AND file_size_limit = 52428800
      AND allowed_mime_types = ARRAY['audio/mpeg']::text[]
  ) THEN
    RAISE EXCEPTION 'podcast-audio requires a private 50 MiB audio/mpeg bucket';
  END IF;
END $$;

-- Keep the bucket private even if another feature adds broad Storage policies.
CREATE POLICY podcast_audio_private ON storage.objects AS RESTRICTIVE
  FOR ALL TO anon, authenticated
  USING (bucket_id <> 'podcast-audio')
  WITH CHECK (bucket_id <> 'podcast-audio');

CREATE TABLE public.podcast_video_audio (
  youtube_id text PRIMARY KEY CHECK (youtube_id ~ '^[A-Za-z0-9_-]{11}$'),
  upload_id uuid NOT NULL UNIQUE,
  object_path text NOT NULL UNIQUE,
  file_name text NOT NULL CHECK (length(file_name) BETWEEN 5 AND 180),
  size_bytes integer NOT NULL CHECK (size_bytes BETWEEN 4 AND 52428800),
  uploaded_at timestamptz NOT NULL,
  attached_by uuid NOT NULL
);

ALTER TABLE public.podcast_video_audio ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.podcast_video_audio FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON public.podcast_video_audio TO service_role;

CREATE FUNCTION public.attach_podcast_video_audio(
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
  ON CONFLICT (youtube_id) DO UPDATE SET
    upload_id = EXCLUDED.upload_id, object_path = EXCLUDED.object_path,
    file_name = EXCLUDED.file_name, size_bytes = EXCLUDED.size_bytes,
    uploaded_at = EXCLUDED.uploaded_at, attached_by = EXCLUDED.attached_by
  WHERE (current_audio.uploaded_at, current_audio.upload_id) < (EXCLUDED.uploaded_at, EXCLUDED.upload_id)
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

REVOKE ALL ON FUNCTION public.attach_podcast_video_audio(text, uuid, uuid, text, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_podcast_video_audio(text, uuid, uuid, text, integer)
  TO service_role;
