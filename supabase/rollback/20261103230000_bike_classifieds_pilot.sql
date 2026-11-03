-- Operational rollback only, after authorization. Keeps all drafts and media.
BEGIN;
UPDATE public.member_classifieds_settings SET enabled=false WHERE singleton;
COMMIT;
-- Revert the frontend commit to remove navigation/Home/account entry points.
-- Never delete storage.objects metadata directly: use the Storage API for cleanup.
-- Re-enabling preserves existing publication states; inspect them before reopening.
