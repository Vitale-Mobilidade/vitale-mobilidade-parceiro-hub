-- Preserve ledger/consent/receipts. Do not delete messages or reset uncertain results.
BEGIN;
UPDATE public.price_alert_email_settings SET enabled=false WHERE singleton;
COMMIT;
-- Restore frontend/server/Edge code from base 0fd30b6 after gates are off.
-- Hotpipe has an independent rollback.sql with the captured original claim function.
