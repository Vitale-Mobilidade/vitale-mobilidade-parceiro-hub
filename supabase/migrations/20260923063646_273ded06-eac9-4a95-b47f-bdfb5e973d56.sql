CREATE FUNCTION public.project_bikes_from_snapshot(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  v_id text; v_name text; v_aut numeric; v_cap smallint; v_slug text;
  n_ins int := 0; n_upd int := 0; n_same int := 0;
  conflicts jsonb := '[]'::jsonb;
  cur public.bikes%ROWTYPE;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'p_rows must be a json array'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_id := r->>'bike_id';
    v_name := btrim(coalesce(r->>'name',''));
    v_aut := CASE WHEN jsonb_typeof(r->'autonomy_km')='number' AND (r->>'autonomy_km')::numeric > 0 THEN (r->>'autonomy_km')::numeric END;
    v_cap := CASE WHEN r->>'capacity_people' IN ('1','2') THEN (r->>'capacity_people')::smallint END;
    IF v_id IS NULL OR v_id !~* '^[a-z0-9][a-z0-9_-]{0,63}$' OR v_name = '' THEN
      conflicts := conflicts || jsonb_build_object('bike_id', v_id, 'reason', 'invalid_id_or_name');
      CONTINUE;
    END IF;
    SELECT * INTO cur FROM public.bikes WHERE bike_id = v_id;
    IF FOUND THEN
      IF cur.name IS DISTINCT FROM v_name
         OR (v_aut IS NOT NULL AND cur.autonomy_km IS DISTINCT FROM v_aut)
         OR (v_cap IS NOT NULL AND cur.capacity_people IS DISTINCT FROM v_cap) THEN
        UPDATE public.bikes SET
          name = v_name,
          autonomy_km = coalesce(v_aut, autonomy_km),
          capacity_people = coalesce(v_cap, capacity_people)
        WHERE bike_id = v_id;
        n_upd := n_upd + 1;
      ELSE
        n_same := n_same + 1;
      END IF;
    ELSE
      v_slug := lower(replace(v_id, '_', '-'));
      IF v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' THEN
        conflicts := conflicts || jsonb_build_object('bike_id', v_id, 'reason', 'invalid_slug', 'slug', v_slug);
        CONTINUE;
      END IF;
      IF EXISTS (SELECT 1 FROM public.bikes WHERE slug = v_slug) THEN
        conflicts := conflicts || jsonb_build_object('bike_id', v_id, 'reason', 'slug_collision', 'slug', v_slug);
        CONTINUE;
      END IF;
      INSERT INTO public.bikes (bike_id, slug, name, autonomy_km, capacity_people, source)
      VALUES (v_id, v_slug, v_name, v_aut, v_cap, 'sync');
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', n_ins, 'updated', n_upd, 'unchanged', n_same, 'conflicts', conflicts);
END $$;

REVOKE ALL ON FUNCTION public.project_bikes_from_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_bikes_from_snapshot(jsonb) TO service_role;