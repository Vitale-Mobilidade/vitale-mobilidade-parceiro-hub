DO $$
DECLARE n int; nid int; nslug int; nname int;
BEGIN
  IF to_regclass('public.bikes') IS NOT NULL THEN RAISE EXCEPTION 'public.bikes already exists'; END IF;
  IF to_regprocedure('public.bikes_block_id_change()') IS NOT NULL THEN RAISE EXCEPTION 'bikes_block_id_change() already exists'; END IF;
  SELECT count(*), count(DISTINCT b->>'id'), count(DISTINCT replace(b->>'id','_','-')),
         count(*) FILTER (WHERE length(btrim(coalesce(b->>'name','')))>0)
    INTO n, nid, nslug, nname
    FROM public.bike_catalog_snapshot s, jsonb_array_elements(s.data->'bikes') b WHERE s.id='current';
  IF n <> 30 OR nid <> 30 OR nslug <> 30 OR nname <> 30 THEN
    RAISE EXCEPTION 'snapshot precheck failed: n=% ids=% slugs=% names=%', n, nid, nslug, nname;
  END IF;
END $$;

CREATE TABLE public.bikes (
  bike_id         text PRIMARY KEY CHECK (bike_id ~* '^[a-z0-9][a-z0-9_-]{0,63}$'),
  slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name            text NOT NULL CHECK (length(btrim(name)) > 0),
  autonomy_km     numeric CHECK (autonomy_km IS NULL OR autonomy_km > 0),
  max_speed_kmh   numeric CHECK (max_speed_kmh IS NULL OR max_speed_kmh > 0),
  motor_w         numeric CHECK (motor_w IS NULL OR motor_w > 0),
  battery         text,
  capacity_people smallint CHECK (capacity_people IS NULL OR capacity_people IN (1, 2)),
  source          text NOT NULL DEFAULT 'snapshot_backfill',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION public.bikes_block_id_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.bike_id IS DISTINCT FROM OLD.bike_id THEN
    RAISE EXCEPTION 'bike_id is immutable';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TRIGGER bikes_immutable_id BEFORE UPDATE ON public.bikes
  FOR EACH ROW EXECUTE FUNCTION public.bikes_block_id_change();

REVOKE ALL ON public.bikes FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bikes TO service_role;
ALTER TABLE public.bikes ENABLE ROW LEVEL SECURITY;

INSERT INTO public.bikes (bike_id, slug, name, source)
SELECT b->>'id', replace(b->>'id','_','-'), btrim(b->>'name'), 'snapshot_backfill'
FROM public.bike_catalog_snapshot s, jsonb_array_elements(s.data->'bikes') b
WHERE s.id = 'current';

DO $$
BEGIN
  IF (SELECT count(*) FROM public.bikes) <> 30 THEN RAISE EXCEPTION 'backfill count mismatch'; END IF;
END $$;