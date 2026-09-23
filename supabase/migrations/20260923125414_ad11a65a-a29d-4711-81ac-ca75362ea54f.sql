-- Etapa 6/7 (incremento): campos editoriais opcionais em public.bikes, projetados do snapshot.
-- Aditiva. Sem preço, link afiliado, elegibilidade ou PII.

ALTER TABLE public.bikes
  ADD COLUMN image_url text,
  ADD COLUMN description text,
  ADD COLUMN short_description text;

ALTER TABLE public.bikes
  ADD CONSTRAINT bikes_image_url_https_chk
  CHECK (image_url IS NULL OR image_url ~ '^https://[^\s"''<>]+$');

-- Projeção: mesma rotina, agora também com image_url/description/short_description.
CREATE OR REPLACE FUNCTION public.project_bikes_from_snapshot(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  v_id text; v_name text; v_aut numeric; v_cap smallint; v_slug text;
  v_img text; v_desc text; v_short text;
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
    v_img := nullif(btrim(coalesce(r->>'image_url','')), '');
    IF v_img IS NOT NULL AND v_img !~ '^https://[^\s"''<>]+$' THEN v_img := NULL; END IF;
    v_desc := nullif(btrim(coalesce(r->>'description','')), '');
    v_short := nullif(btrim(coalesce(r->>'short_description','')), '');
    IF v_id IS NULL OR v_id !~* '^[a-z0-9][a-z0-9_-]{0,63}$' OR v_name = '' THEN
      conflicts := conflicts || jsonb_build_object('bike_id', v_id, 'reason', 'invalid_id_or_name');
      CONTINUE;
    END IF;
    SELECT * INTO cur FROM public.bikes WHERE bike_id = v_id;
    IF FOUND THEN
      IF cur.name IS DISTINCT FROM v_name
         OR (v_aut IS NOT NULL AND cur.autonomy_km IS DISTINCT FROM v_aut)
         OR (v_cap IS NOT NULL AND cur.capacity_people IS DISTINCT FROM v_cap)
         OR (v_img IS NOT NULL AND cur.image_url IS DISTINCT FROM v_img)
         OR (v_desc IS NOT NULL AND cur.description IS DISTINCT FROM v_desc)
         OR (v_short IS NOT NULL AND cur.short_description IS DISTINCT FROM v_short) THEN
        UPDATE public.bikes SET
          name = v_name,
          autonomy_km = coalesce(v_aut, autonomy_km),
          capacity_people = coalesce(v_cap, capacity_people),
          image_url = coalesce(v_img, image_url),
          description = coalesce(v_desc, description),
          short_description = coalesce(v_short, short_description)
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
      INSERT INTO public.bikes (bike_id, slug, name, autonomy_km, capacity_people, image_url, description, short_description, source)
      VALUES (v_id, v_slug, v_name, v_aut, v_cap, v_img, v_desc, v_short, 'sync');
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', n_ins, 'updated', n_upd, 'unchanged', n_same, 'conflicts', conflicts);
END $$;

REVOKE ALL ON FUNCTION public.project_bikes_from_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_bikes_from_snapshot(jsonb) TO service_role;

-- Backfill idempotente a partir do snapshot atual (somente fatos existentes; NULL nunca sobrescreve).
WITH snap AS (
  SELECT b->>'id' AS bike_id,
         nullif(btrim(coalesce(b->>'image','')), '') AS image_url,
         nullif(btrim(coalesce(b->>'description','')), '') AS description,
         nullif(btrim(coalesce(b->>'shortDescription','')), '') AS short_description
  FROM public.bike_catalog_snapshot s,
       jsonb_array_elements(s.data->'bikes') b
  WHERE s.id = 'current'
)
UPDATE public.bikes t SET
  image_url = coalesce(CASE WHEN snap.image_url ~ '^https://[^\s"''<>]+$' THEN snap.image_url END, t.image_url),
  description = coalesce(snap.description, t.description),
  short_description = coalesce(snap.short_description, t.short_description)
FROM snap
WHERE t.bike_id = snap.bike_id
  AND (
    (snap.image_url IS NOT NULL AND snap.image_url ~ '^https://[^\s"''<>]+$' AND t.image_url IS DISTINCT FROM snap.image_url)
    OR (snap.description IS NOT NULL AND t.description IS DISTINCT FROM snap.description)
    OR (snap.short_description IS NOT NULL AND t.short_description IS DISTINCT FROM snap.short_description)
  );

DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM public.bikes;
  IF n <> 30 THEN RAISE EXCEPTION 'bikes count changed: %', n; END IF;
END $$;