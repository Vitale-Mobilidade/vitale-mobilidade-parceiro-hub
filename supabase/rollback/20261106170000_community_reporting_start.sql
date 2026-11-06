BEGIN;
-- Only presentation/apuração changes; never modify historical finance or identity rows.
UPDATE public.member_reporting_settings SET tracking_since=NULL,excluded_order_ids='{}',note='Marco desativado por rollback',updated_at=now() WHERE singleton;
NOTIFY pgrst,'reload schema';
COMMIT;
