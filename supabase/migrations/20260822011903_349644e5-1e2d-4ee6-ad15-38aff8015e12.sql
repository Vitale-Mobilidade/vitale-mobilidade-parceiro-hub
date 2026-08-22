-- utilitário de updated_at (independente do set_updated_at existente)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============ IMAGENS ============
CREATE TABLE public.bike_assets (
  bike_id text PRIMARY KEY,
  source_url text,
  stored_source_url text,
  storage_path text,
  public_url text,
  content_type text,
  bytes integer,
  checksum text,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  error_message text,
  needs_review boolean NOT NULL DEFAULT false,
  downloaded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bike_assets TO service_role;
ALTER TABLE public.bike_assets ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bike_assets_updated_at BEFORE UPDATE ON public.bike_assets
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ PERFIL TÉCNICO (IA) ============
CREATE TABLE public.bike_profiles (
  bike_id text PRIMARY KEY,
  technical_hash text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending',
  data jsonb,
  missing_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  model text,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bike_profiles TO service_role;
ALTER TABLE public.bike_profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bike_profiles_updated_at BEFORE UPDATE ON public.bike_profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bike_profile_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bike_id text NOT NULL,
  technical_hash text NOT NULL,
  status text NOT NULL DEFAULT 'queued',
  attempts integer NOT NULL DEFAULT 0,
  locked_at timestamptz,
  error_message text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (bike_id, technical_hash)
);
GRANT ALL ON public.bike_profile_jobs TO service_role;
ALTER TABLE public.bike_profile_jobs ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bike_profile_jobs_updated_at BEFORE UPDATE ON public.bike_profile_jobs
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ ELEGIBILIDADE ADMIN ============
CREATE TABLE public.bike_admin_overrides (
  bike_id text PRIMARY KEY,
  eligible boolean NOT NULL DEFAULT false,
  updated_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bike_admin_overrides TO service_role;
ALTER TABLE public.bike_admin_overrides ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bike_admin_overrides_updated_at BEFORE UPDATE ON public.bike_admin_overrides
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.bike_admin_overrides (bike_id, eligible, updated_by)
SELECT unnest(ARRAY[
  'ft03','v20_mini','v9_max','v10_max','v40_pro','v8_pro','v8_pro_s',
  'v8_ultra','ouxi_gt20','ouxi_gt20_pro','coswheel_gt20','gt2000',
  'v29_pro','v35','v20_pro','s8','bw02','f6_pro_s','d50_cross'
]), true, 'migration';

CREATE TABLE public.bike_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  bike_id text,
  detail jsonb,
  actor text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bike_admin_audit TO service_role;
ALTER TABLE public.bike_admin_audit ENABLE ROW LEVEL SECURITY;

-- ============ AUTENTICAÇÃO DO PAINEL ============
CREATE TABLE public.bike_panel_credentials (
  id text PRIMARY KEY DEFAULT 'current',
  salt_base64 text NOT NULL,
  hash_base64 text NOT NULL,
  iterations integer NOT NULL DEFAULT 310000,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bike_panel_credentials_singleton CHECK (id = 'current'),
  CONSTRAINT bike_panel_credentials_iterations CHECK (iterations >= 310000)
);
GRANT ALL ON public.bike_panel_credentials TO service_role;
ALTER TABLE public.bike_panel_credentials ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER bike_panel_credentials_updated_at BEFORE UPDATE ON public.bike_panel_credentials
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.bike_panel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash text NOT NULL UNIQUE,
  remember boolean NOT NULL DEFAULT false,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bike_panel_sessions TO service_role;
ALTER TABLE public.bike_panel_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.bike_panel_login_attempts (
  fingerprint text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bike_panel_login_attempts TO service_role;
ALTER TABLE public.bike_panel_login_attempts ENABLE ROW LEVEL SECURITY;

-- ============ FECHAR LEITURA PÚBLICA DO CATÁLOGO ============
DROP POLICY IF EXISTS "Public can read bike catalog snapshot" ON public.bike_catalog_snapshot;
DROP POLICY IF EXISTS "Public can read bike catalog sync state" ON public.bike_catalog_sync_state;
REVOKE ALL ON public.bike_catalog_snapshot FROM anon, authenticated;
REVOKE ALL ON public.bike_catalog_sync_state FROM anon, authenticated;
GRANT ALL ON public.bike_catalog_snapshot TO service_role;
GRANT ALL ON public.bike_catalog_sync_state TO service_role;

-- ============ RPC PÚBLICA MÍNIMA PARA O QUIZ ============
CREATE OR REPLACE FUNCTION public.get_quiz_catalog()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(jsonb_agg(x.bike), '[]'::jsonb)
  FROM (
    SELECT jsonb_strip_nulls(jsonb_build_object(
      'id', b->>'id',
      'name', b->>'name',
      'linkVitale', b->>'linkVitale',
      'price', (b->>'price')::numeric,
      'autonomyKm', (b->>'autonomyKm')::int,
      'capacity', (b->>'capacity')::int,
      'description', b->>'description',
      'shortDescription', b->>'shortDescription',
      'image', COALESCE(a.public_url, b->>'image'),
      'weightSupportKg', COALESCE((p.data->>'weightSupportKg')::int, (b->>'weightSupportKg')::int),
      'bestFor', COALESCE(p.data->'bestFor', b->'bestFor'),
      'terrains', COALESCE(p.data->'terrains', b->'terrains'),
      'strengths', COALESCE(p.data->'strengths', b->'strengths'),
      'diferencial', COALESCE(p.data->>'diferencial', b->>'diferencial'),
      'perfilIndicado', COALESCE(p.data->>'perfilIndicado', b->>'perfilIndicado'),
      'isNew', COALESCE((b->>'isNew')::boolean, false),
      'status', 'eligible'
    )) AS bike
    FROM public.bike_catalog_snapshot s
    CROSS JOIN LATERAL jsonb_array_elements(COALESCE(s.data->'bikes', '[]'::jsonb)) b
    LEFT JOIN public.bike_admin_overrides o ON o.bike_id = b->>'id'
    LEFT JOIN public.bike_assets a ON a.bike_id = b->>'id'
    LEFT JOIN public.bike_profiles p ON p.bike_id = b->>'id' AND p.status = 'ready'
    WHERE s.id = 'current'
      AND COALESCE(b->>'status', 'eligible') <> 'inactive'
      AND COALESCE(o.eligible, false) = true
      AND (
        COALESCE((b->>'isNew')::boolean, false) = false
        OR (a.status = 'ready' AND a.public_url IS NOT NULL AND p.status = 'ready')
      )
  ) x;
$$;
GRANT EXECUTE ON FUNCTION public.get_quiz_catalog() TO anon, authenticated;