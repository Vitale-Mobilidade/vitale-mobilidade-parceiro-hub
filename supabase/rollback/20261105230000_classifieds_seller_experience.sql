BEGIN;
-- Disable the new surface without erasing financial/media/event history or resetting dates.
DROP FUNCTION public.member_classifieds(text,jsonb);
ALTER FUNCTION public.member_classifieds_before_seller_experience(text,jsonb) RENAME TO member_classifieds;
GRANT EXECUTE ON FUNCTION public.member_classifieds(text,jsonb) TO authenticated,service_role;
DROP FUNCTION public.admin_channel_classifieds(uuid,text,jsonb);
ALTER FUNCTION public.admin_channel_classifieds_before_seller_experience(uuid,text,jsonb) RENAME TO admin_channel_classifieds;
GRANT EXECUTE ON FUNCTION public.admin_channel_classifieds(uuid,text,jsonb) TO service_role;
DROP FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean);
ALTER FUNCTION public.member_billing_purchase_before_seller_experience(uuid,uuid,boolean,boolean) RENAME TO member_billing_purchase;
GRANT EXECUTE ON FUNCTION public.member_billing_purchase(uuid,uuid,boolean,boolean) TO service_role;
DROP FUNCTION public.member_billing_record_payment(uuid,text,text,boolean,date,timestamptz);
ALTER FUNCTION public.member_billing_record_payment_before_seller_experience(uuid,text,text,boolean,date,timestamptz) RENAME TO member_billing_record_payment;
GRANT EXECUTE ON FUNCTION public.member_billing_record_payment(uuid,text,text,boolean,date,timestamptz) TO service_role;
DROP FUNCTION public.member_billing_recalculate(uuid);
ALTER FUNCTION public.member_billing_recalculate_before_seller_experience(uuid) RENAME TO member_billing_recalculate;
GRANT EXECUTE ON FUNCTION public.member_billing_recalculate(uuid) TO service_role;
DROP FUNCTION public.member_listing_json(public.member_bike_listings);
ALTER FUNCTION public.member_listing_json_before_seller_experience(public.member_bike_listings) RENAME TO member_listing_json;
DROP FUNCTION public.member_listing_visible(uuid);
ALTER FUNCTION public.member_listing_visible_before_seller_experience(uuid) RENAME TO member_listing_visible;
REVOKE ALL ON FUNCTION public.member_listing_track(uuid,text,uuid) FROM PUBLIC,anon,authenticated;
-- New tables/columns and purchased_listing_id capture stay private for audit.
-- Revert frontend/Asaas currentOrder code to the release before this migration as a companion step.
NOTIFY pgrst, 'reload schema';
COMMIT;
