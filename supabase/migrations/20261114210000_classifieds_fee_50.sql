BEGIN;
SET LOCAL lock_timeout = '5s';

ALTER TABLE public.member_classifieds_settings
  DROP CONSTRAINT member_classifieds_settings_listing_fee_cents_check,
  ALTER COLUMN listing_fee_cents SET DEFAULT 5000,
  ADD CONSTRAINT member_classifieds_settings_listing_fee_cents_check CHECK (listing_fee_cents IN (5000, 15000));
UPDATE public.member_classifieds_settings SET listing_fee_cents = 5000 WHERE singleton;

-- Leave existing listings and financial orders intact.
ALTER TABLE public.member_bike_listings
  DROP CONSTRAINT member_bike_listings_fee_cents_check,
  ALTER COLUMN fee_cents SET DEFAULT 5000,
  ADD CONSTRAINT member_bike_listings_fee_cents_check CHECK (fee_cents IN (5000, 15000));

ALTER TABLE public.member_listing_billing
  DROP CONSTRAINT member_listing_billing_amount_cents_check,
  ALTER COLUMN amount_cents SET DEFAULT 5000,
  ADD CONSTRAINT member_listing_billing_amount_cents_check CHECK (amount_cents IN (5000, 15000));

-- A cached deployment must not reserve a new amount using the previous checkout contract.
CREATE FUNCTION public.member_billing_purchase_at_price(
  p_actor uuid, p_id uuid, p_contact boolean, p_accepted boolean, p_expected_amount integer
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_price integer;
  purchase jsonb;
BEGIN
  SELECT listing_fee_cents INTO current_price
    FROM public.member_classifieds_settings WHERE singleton FOR SHARE;
  IF p_expected_amount IS NULL OR current_price IS DISTINCT FROM p_expected_amount THEN
    RAISE EXCEPTION 'billing_price_changed';
  END IF;
  purchase := public.member_billing_purchase(p_actor, p_id, p_contact, p_accepted);
  IF (purchase->>'reserved')::boolean IS TRUE
    AND (purchase->>'amount_cents')::integer IS DISTINCT FROM current_price THEN
    RAISE EXCEPTION 'billing_price_changed';
  END IF;
  RETURN purchase;
END $$;
REVOKE ALL ON FUNCTION public.member_billing_purchase_at_price(uuid,uuid,boolean,boolean,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.member_billing_purchase_at_price(uuid,uuid,boolean,boolean,integer) TO service_role;
REVOKE EXECUTE ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) FROM service_role;

COMMIT;
