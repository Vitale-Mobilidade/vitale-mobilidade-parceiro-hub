-- Suspend public creation without deleting members, ads or paid rights.
UPDATE public.member_classifieds_settings SET public_enabled=false WHERE singleton;
