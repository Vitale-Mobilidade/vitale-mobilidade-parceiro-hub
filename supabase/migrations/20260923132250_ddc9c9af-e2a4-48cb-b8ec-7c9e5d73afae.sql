-- Etapa 10 — campos editoriais de paridade + leitura pública do catálogo (bikes + oferta atual).
-- Aditiva. Não altera IDs, slugs, ofertas, elegibilidade do Quiz nem RPCs existentes.

ALTER TABLE public.bikes
  ADD COLUMN category text,
  ADD COLUMN autonomy_label text,
  ADD COLUMN capacity_label text;

CREATE OR REPLACE FUNCTION public.project_bikes_from_snapshot(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb;
  v_id text; v_name text; v_aut numeric; v_cap smallint; v_slug text;
  v_img text; v_desc text; v_short text; v_cat text; v_autl text; v_capl text;
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
    v_cat := nullif(btrim(coalesce(r->>'category','')), '');
    v_autl := nullif(btrim(coalesce(r->>'autonomy_label','')), '');
    v_capl := nullif(btrim(coalesce(r->>'capacity_label','')), '');
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
         OR (v_short IS NOT NULL AND cur.short_description IS DISTINCT FROM v_short)
         OR (v_cat IS NOT NULL AND cur.category IS DISTINCT FROM v_cat)
         OR (v_autl IS NOT NULL AND cur.autonomy_label IS DISTINCT FROM v_autl)
         OR (v_capl IS NOT NULL AND cur.capacity_label IS DISTINCT FROM v_capl) THEN
        UPDATE public.bikes SET
          name = v_name,
          autonomy_km = coalesce(v_aut, autonomy_km),
          capacity_people = coalesce(v_cap, capacity_people),
          image_url = coalesce(v_img, image_url),
          description = coalesce(v_desc, description),
          short_description = coalesce(v_short, short_description),
          category = coalesce(v_cat, category),
          autonomy_label = coalesce(v_autl, autonomy_label),
          capacity_label = coalesce(v_capl, capacity_label)
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
      INSERT INTO public.bikes (bike_id, slug, name, autonomy_km, capacity_people, image_url, description, short_description, category, autonomy_label, capacity_label, source)
      VALUES (v_id, v_slug, v_name, v_aut, v_cap, v_img, v_desc, v_short, v_cat, v_autl, v_capl, 'sync');
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', n_ins, 'updated', n_upd, 'unchanged', n_same, 'conflicts', conflicts);
END $$;

REVOKE ALL ON FUNCTION public.project_bikes_from_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_bikes_from_snapshot(jsonb) TO service_role;

-- Leitura pública read-only: bike + NO MÁXIMO uma oferta atual (preço e link do MESMO registro).
CREATE FUNCTION public.get_bikes_public_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'name'), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
             'bikeId', b.bike_id,
             'slug', b.slug,
             'name', b.name,
             'category', b.category,
             'autonomy', b.autonomy_label,
             'capacity', b.capacity_label,
             'autonomyKm', b.autonomy_km,
             'capacityPeople', b.capacity_people,
             'description', b.description,
             'shortDescription', b.short_description,
             'image', b.image_url,
             'price', o.price,
             'link', o.url
           ) AS x
    FROM public.bikes b
    LEFT JOIN LATERAL (
      SELECT f.price, f.url
      FROM public.bike_offers f
      WHERE f.bike_id = b.bike_id
        AND f.is_current
        AND f.ended_at IS NULL
        AND f.price > 0
        AND f.url ~ '^https://meli\.la/[A-Za-z0-9]+$'
      ORDER BY f.synced_at DESC, f.first_seen_at DESC
      LIMIT 1
    ) o ON true
  ) s;
$$;

REVOKE ALL ON FUNCTION public.get_bikes_public_catalog() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_bikes_public_catalog() TO anon, authenticated, service_role;

COMMENT ON FUNCTION public.get_bikes_public_catalog() IS
  'Catálogo editorial público: public.bikes + no máximo uma oferta atual válida por bike (preço e link do mesmo registro). Sem elegibilidade do Quiz, sem PII, sem data de verificação humana.';
