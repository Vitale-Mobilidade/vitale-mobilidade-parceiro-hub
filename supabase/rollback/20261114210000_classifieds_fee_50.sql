BEGIN;
SET LOCAL lock_timeout = '5s';
-- Roll back pricing for new purchases only. Keep the reader that understands both values.
ALTER TABLE public.member_classifieds_settings ALTER COLUMN listing_fee_cents SET DEFAULT 15000;
UPDATE public.member_classifieds_settings SET listing_fee_cents = 15000 WHERE singleton;
ALTER TABLE public.member_bike_listings ALTER COLUMN fee_cents SET DEFAULT 15000;
ALTER TABLE public.member_listing_billing ALTER COLUMN amount_cents SET DEFAULT 15000;
COMMIT;
