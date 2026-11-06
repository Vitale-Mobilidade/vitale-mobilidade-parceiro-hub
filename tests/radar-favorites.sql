-- Synthetic identities; never run against an existing database.
SET ROLE anon;
DO $$ BEGIN
  BEGIN PERFORM public.member_radar_favorites('list'); RAISE EXCEPTION 'anon bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET ROLE authenticated;
DO $$ BEGIN
  BEGIN PERFORM public.member_radar_favorites('list'); RAISE EXCEPTION 'missing auth bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'forbidden' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
  ASSERT public.member_radar_favorites('list') = '[]'::jsonb;
  ASSERT public.member_radar_favorites('set','v9_max',true) = '{"saved":true}'::jsonb;
  PERFORM public.member_radar_favorites('set','v9_max',true);
  ASSERT public.member_radar_favorites('list') = '["v9_max"]'::jsonb;
  BEGIN PERFORM public.member_radar_favorites('set','missing',true); RAISE EXCEPTION 'unknown bike bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'bike_unavailable' THEN RAISE; END IF; END;
  BEGIN PERFORM public.member_radar_favorites('set','../bad',true); RAISE EXCEPTION 'invalid ID bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invalid_favorite' THEN RAISE; END IF; END;
  BEGIN PERFORM public.member_radar_favorites('set','v9_max',NULL); RAISE EXCEPTION 'null state bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invalid_favorite' THEN RAISE; END IF; END;
  BEGIN PERFORM public.member_radar_favorites('other'); RAISE EXCEPTION 'invalid action bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'invalid_action' THEN RAISE; END IF; END;
  BEGIN PERFORM * FROM public.member_radar_favorites; RAISE EXCEPTION 'direct read bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN INSERT INTO public.member_radar_favorites(user_id,bike_id) VALUES ('00000000-0000-4000-8000-000000000002','v8_pro'); RAISE EXCEPTION 'direct write bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
  ASSERT public.member_radar_favorites('list') = '[]'::jsonb, 'cross-user read';
  PERFORM public.member_radar_favorites('set','v9_max',false);
  ASSERT public.member_radar_favorites('list') = '[]'::jsonb;
  PERFORM public.member_radar_favorites('set','v8_pro',true);
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false);
DO $$ BEGIN
  ASSERT public.member_radar_favorites('list') = '["v9_max"]'::jsonb, 'cross-user delete';
  PERFORM public.member_radar_favorites('set','v9_max',false);
  PERFORM public.member_radar_favorites('set','v9_max',false);
  ASSERT public.member_radar_favorites('list') = '[]'::jsonb;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000003',false);
DO $$ BEGIN
  BEGIN PERFORM public.member_radar_favorites('set','v9_max',true); RAISE EXCEPTION 'anonymous session bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'forbidden' THEN RAISE; END IF; END;
END $$;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000004',false);
DO $$ BEGIN
  BEGIN PERFORM public.member_radar_favorites('list'); RAISE EXCEPTION 'deleted user bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'forbidden' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
-- Even an accidental table grant does not open RLS.
GRANT SELECT,INSERT,DELETE ON public.member_radar_favorites TO authenticated;
SET ROLE authenticated;
DO $$ BEGIN
  ASSERT NOT EXISTS(SELECT 1 FROM public.member_radar_favorites);
  BEGIN INSERT INTO public.member_radar_favorites(user_id,bike_id) VALUES ('00000000-0000-4000-8000-000000000004','v9_max'); RAISE EXCEPTION 'RLS bypass'; EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
UPDATE public.member_community_settings SET enabled=false;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',false);
DO $$ BEGIN
  BEGIN PERFORM public.member_radar_favorites('set','v9_max',true); RAISE EXCEPTION 'flag bypass'; EXCEPTION WHEN raise_exception THEN IF SQLERRM <> 'community_disabled' THEN RAISE; END IF; END;
END $$;
RESET ROLE;
DELETE FROM auth.users WHERE id='00000000-0000-4000-8000-000000000002';
DO $$ BEGIN ASSERT NOT EXISTS (SELECT 1 FROM public.member_radar_favorites), 'account deletion must remove favorites'; END $$;
