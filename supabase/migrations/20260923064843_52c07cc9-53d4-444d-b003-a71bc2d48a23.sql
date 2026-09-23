ALTER TABLE public.bike_offers RENAME COLUMN quiz_eligible TO radar_eligible;
ALTER TABLE public.bike_offers ADD CONSTRAINT bike_offers_url_meli_la CHECK (url ~ '^https://meli\.la/[A-Za-z0-9]+$');
COMMENT ON COLUMN public.bike_offers.radar_eligible IS 'Elegibilidade comercial do Radar (status=eligible, sheetEligible, override, preco e link validos). NAO e decisao do Quiz.';
COMMENT ON COLUMN public.bike_offers.synced_at IS 'Ultima projecao bem-sucedida do sync (nao e verificacao humana).';
COMMENT ON COLUMN public.bike_offers.verified_at IS 'Verificacao humana; NULL ate existir processo.';

CREATE OR REPLACE FUNCTION public.project_bike_offers_from_snapshot(p_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  r jsonb; v_id text; v_url text; v_price numeric; v_status text; v_sheet boolean; v_ovr boolean; v_radar boolean;
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
    v_url := CASE WHEN jsonb_typeof(r->'url') = 'string' THEN r->>'url' END;
    v_price := CASE WHEN jsonb_typeof(r->'price') = 'number' AND (r->>'price')::numeric > 0 THEN (r->>'price')::numeric END;
    v_status := coalesce(r->>'sheet_status', 'eligible');
    v_sheet := CASE WHEN jsonb_typeof(r->'sheet_eligible') = 'boolean' THEN (r->>'sheet_eligible')::boolean END;
    v_ovr := NULL;
    SELECT o.eligible INTO v_ovr FROM public.bike_admin_overrides o WHERE o.bike_id = v_id;
    v_radar := v_status = 'eligible' AND coalesce(v_sheet, false) AND coalesce(v_ovr, false);

    SELECT * INTO cur FROM public.bike_offers WHERE bike_id = v_id AND source = 'sheet' AND is_current;

    IF v_price IS NULL OR v_url IS NULL OR v_url !~ '^https://meli\.la/[A-Za-z0-9]+$' THEN
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
         OR cur.radar_eligible IS DISTINCT FROM v_radar THEN
        UPDATE public.bike_offers SET price = v_price, sheet_status = v_status, sheet_eligible = v_sheet,
          override_eligible = v_ovr, radar_eligible = v_radar, synced_at = now()
        WHERE id = cur.id;
        n_upd := n_upd + 1;
      ELSE
        -- Resync sem mudança comercial: só registra a projeção bem-sucedida.
        UPDATE public.bike_offers SET synced_at = now() WHERE id = cur.id;
        n_same := n_same + 1;
      END IF;
    ELSE
      IF cur.id IS NOT NULL THEN
        UPDATE public.bike_offers SET is_current = false, ended_at = now(), end_reason = 'link_changed' WHERE id = cur.id;
        n_end := n_end + 1;
      END IF;
      INSERT INTO public.bike_offers (bike_id, source, url, price, sheet_status, sheet_eligible, override_eligible, radar_eligible)
      VALUES (v_id, 'sheet', v_url, v_price, v_status, v_sheet, v_ovr, v_radar);
      n_ins := n_ins + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('inserted', n_ins, 'updated', n_upd, 'unchanged', n_same, 'ended', n_end, 'skipped', skipped);
END $$;

REVOKE ALL ON FUNCTION public.project_bike_offers_from_snapshot(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.project_bike_offers_from_snapshot(jsonb) TO service_role;

DO $chk$
DECLARE v_diff int;
BEGIN
  SELECT count(*) INTO v_diff FROM (
    (SELECT bike_id FROM public.bike_offers WHERE is_current AND radar_eligible
     EXCEPT SELECT x->>'id' FROM jsonb_array_elements(public.get_price_tracker_catalog()) x)
    UNION ALL
    (SELECT x->>'id' FROM jsonb_array_elements(public.get_price_tracker_catalog()) x
     EXCEPT SELECT bike_id FROM public.bike_offers WHERE is_current AND radar_eligible)
  ) d;
  IF v_diff <> 0 THEN RAISE EXCEPTION 'radar set mismatch: %', v_diff; END IF;
END $chk$;