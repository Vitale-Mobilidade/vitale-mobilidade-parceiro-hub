-- Additive. Apply only after backup/rehearsal and explicit production authorization.
BEGIN;
CREATE TABLE public.member_radar_favorites (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bike_id text NOT NULL REFERENCES public.bikes(bike_id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bike_id)
);
ALTER TABLE public.member_radar_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.member_radar_favorites FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.member_radar_favorites TO service_role;

-- No caller-supplied user ID. Direct access stays denied even to authenticated members.
CREATE FUNCTION public.member_radar_favorites(p_action text, p_bike_id text DEFAULT NULL, p_saved boolean DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE actor uuid := auth.uid();
BEGIN
  IF actor IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users u WHERE u.id = actor AND NOT coalesce(u.is_anonymous, false) AND u.deleted_at IS NULL
  ) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.member_community_settings WHERE singleton AND enabled)
    THEN RAISE EXCEPTION 'community_disabled'; END IF;
  IF p_action = 'list' THEN
    RETURN (SELECT coalesce(jsonb_agg(f.bike_id ORDER BY f.created_at DESC, f.bike_id), '[]'::jsonb)
      FROM public.member_radar_favorites f WHERE f.user_id = actor);
  ELSIF p_action = 'set' THEN
    IF p_bike_id IS NULL OR p_bike_id !~ '^[a-z0-9][a-z0-9_-]{0,63}$' OR p_saved IS NULL
      THEN RAISE EXCEPTION 'invalid_favorite'; END IF;
    IF p_saved THEN
      IF NOT EXISTS (SELECT 1 FROM public.bikes b WHERE b.bike_id = p_bike_id)
        THEN RAISE EXCEPTION 'bike_unavailable'; END IF;
      INSERT INTO public.member_radar_favorites(user_id, bike_id) VALUES(actor, p_bike_id)
        ON CONFLICT (user_id, bike_id) DO NOTHING;
    ELSE
      DELETE FROM public.member_radar_favorites WHERE user_id = actor AND bike_id = p_bike_id;
    END IF;
    RETURN jsonb_build_object('saved', p_saved);
  END IF;
  RAISE EXCEPTION 'invalid_action';
END $$;
REVOKE ALL ON FUNCTION public.member_radar_favorites(text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_radar_favorites(text, text, boolean) TO authenticated;
COMMIT;
