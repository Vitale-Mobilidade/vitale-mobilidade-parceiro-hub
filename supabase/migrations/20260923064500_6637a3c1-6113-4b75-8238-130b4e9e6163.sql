DO $pre$
BEGIN
  IF to_regclass('public.bike_offers') IS NOT NULL THEN RAISE EXCEPTION 'bike_offers already exists'; END IF;
  IF to_regclass('public.bikes') IS NULL THEN RAISE EXCEPTION 'bikes missing'; END IF;
END $pre$;

CREATE TABLE public.bike_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id text NOT NULL REFERENCES public.bikes(bike_id) ON UPDATE RESTRICT ON DELETE RESTRICT,
  source text NOT NULL DEFAULT 'sheet' CHECK (source IN ('sheet')),
  url text NOT NULL,
  price numeric NOT NULL CHECK (price > 0),
  currency text NOT NULL DEFAULT 'BRL' CHECK (currency = 'BRL'),
  sheet_status text,
  sheet_eligible boolean,
  override_eligible boolean,
  quiz_eligible boolean NOT NULL DEFAULT false,
  is_current boolean NOT NULL DEFAULT true,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  synced_at timestamptz NOT NULL DEFAULT now(),
  verified_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bike_offers_url_https CHECK (url ~ '^https://[^[:space:]]+$'),
  CONSTRAINT bike_offers_current_state CHECK (
    (is_current AND ended_at IS NULL AND end_reason IS NULL)
    OR (NOT is_current AND ended_at IS NOT NULL AND end_reason IS NOT NULL))
);
CREATE UNIQUE INDEX bike_offers_one_current_per_source ON public.bike_offers (bike_id, source) WHERE is_current;
CREATE INDEX bike_offers_bike_idx ON public.bike_offers (bike_id, first_seen_at DESC);

REVOKE ALL ON public.bike_offers FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.bike_offers TO service_role;
ALTER TABLE public.bike_offers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER bike_offers_updated_at BEFORE UPDATE ON public.bike_offers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE FUNCTION public.project_bike_offers_from_snapshot(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb; v_id text; v_url text; v_price numeric; v_status text; v_sheet boolean; v_ovr boolean; v_quiz boolean;
  cur public.bike_offers%ROWTYPE;
  n_ins int := 0; n_upd int := 0; n_same int := 0; n_end int := 0;
  skipped jsonb := '[]'::jsonb;
BEGIN
  IF jsonb_typeof(p_rows) <> 'array' THEN RAISE EXCEPTION 'p_rows must be a json array'; END IF;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_id := r->>'bike_id';
    IF v_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.bikes WHERE bike_id = v_id) THEN
      skipped := skipped || jsonb_build_object('bike_id', v_id, 'reason', 'bike_not_in_bikes');
      CONTINUE;
    END IF;
    v_url := r->>'url';
    v_price := CASE WHEN jsonb_typeof(r->'price') = 'number' AND (r->>'price')::numeric > 0 THEN (r->>'price')::numeric END;
    v_status := coalesce(r->>'sheet_status', 'eligible');
    v_sheet := CASE WHEN jsonb_typeof(r->'sheet_eligible') = 'boolean' THEN (r->>'sheet_eligible')::boolean END;
    SELECT o.eligible INTO v_ovr FROM public.bike_admin_overrides o WHERE o.bike_id = v_id;
    v_quiz := v_status = 'eligible' AND coalesce(v_sheet, false) AND coalesce(v_ovr, false);

    SELECT * INTO cur FROM public.bike_offers WHERE bike_id = v_id AND source = 'sheet' AND is_current;

    IF v_price IS NULL OR v_url IS NULL OR v_url !~ '^https://[^[:space:]]+$' THEN
      IF cur.id IS NOT NULL THEN
        UPDATE public.bike_offers SET is_current = false, ended_at = now(),
          end_reason = CASE WHEN v_price IS NULL THEN 'invalid_price' ELSE 'invalid_link' END
        WHERE id = cur.id;
        n_end := n_end + 1;
      END IF;
      skipped := skipped || jsonb_build_object('bike_id', v_id, 'reason', CASE WHEN v_price IS NULL THEN 'invalid_price' ELSE 'invalid_link' END);
      CONTINUE;
    END IF;

    IF cur.id IS NOT NULL AND cur.url = v_url THEN
      IF cur.price IS DISTINCT FROM v_price OR cur.sheet_status IS DISTINCT FROM v_status
         OR cur.sheet_eligible IS DISTINCT FROM v_sheet OR cur.override_eligible IS DISTINCT FROM v_ovr
         OR cur.quiz_eligible IS DISTINCT FROM v_quiz THEN
        UPDATE public.bike_offers SET price = v_price, sheet_status = v_status, sheet_eligible = v_sheet,
          override_eligible = v_ovr, quiz_eligible = v_quiz, synced_at = now()
        WHERE id = cur.id;
        n_upd := n_upd + 1;
      ELSE
        n_same := n_same + 1;
      END IF;
    ELSE
      IF cur.id IS NOT NULL THEN
        UPDATE public.bike_offers SET is_current = false, ended_at = now(), end_reason = 'link_changed' WHERE id = cur.id;
        n_end := n_end + 1;
      END IF;
      INSERT INTO public.bike_offers (bike_id, source, url, price, sheet_status, sheet_eligible, override_eligible, quiz_eligible)
      VALUES (v_id, 'sheet', v_url, v_price, v_status, v_sheet, v_ovr, v_quiz);
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', n_ins, 'updated', n_upd, 'unchanged', n_same, 'ended', n_end, 'skipped', skipped);
END $$;

REVOKE ALL ON FUNCTION public.project_bike_offers_from_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_bike_offers_from_snapshot(jsonb) TO service_role;

-- Backfill + paridade (fail-fast)
DO $bf$
DECLARE v_rows jsonb; v_expected int; v_elig int; v_bad int;
BEGIN
  SELECT jsonb_agg(jsonb_build_object('bike_id', b->>'id', 'url', b->'linkVitale', 'price', b->'price',
           'sheet_status', b->'status', 'sheet_eligible', b->'sheetEligible'))
    INTO v_rows
  FROM public.bike_catalog_snapshot s CROSS JOIN LATERAL jsonb_array_elements(s.data->'bikes') b
  WHERE s.id = 'current';
  IF v_rows IS NULL THEN RAISE EXCEPTION 'snapshot empty'; END IF;
  PERFORM public.project_bike_offers_from_snapshot(v_rows);

  SELECT count(*) INTO v_expected FROM jsonb_array_elements(v_rows) x
   WHERE jsonb_typeof(x->'price')='number' AND (x->>'price')::numeric > 0 AND x->>'url' ~ '^https://[^[:space:]]+$'
     AND EXISTS (SELECT 1 FROM public.bikes WHERE bike_id = x->>'bike_id');
  IF (SELECT count(*) FROM public.bike_offers WHERE is_current) <> v_expected THEN RAISE EXCEPTION 'current offers count mismatch'; END IF;

  SELECT count(*) INTO v_bad FROM jsonb_array_elements(v_rows) x
   JOIN public.bike_offers o ON o.bike_id = x->>'bike_id' AND o.is_current
   WHERE o.url IS DISTINCT FROM x->>'url' OR o.price IS DISTINCT FROM (x->>'price')::numeric;
  IF v_bad <> 0 THEN RAISE EXCEPTION 'price/url parity mismatch: %', v_bad; END IF;

  SELECT jsonb_array_length(public.get_price_tracker_catalog()) INTO v_elig;
  IF (SELECT count(*) FROM public.bike_offers WHERE is_current AND quiz_eligible) <> v_elig THEN
    RAISE EXCEPTION 'eligibility mismatch vs radar';
  END IF;
END $bf$;