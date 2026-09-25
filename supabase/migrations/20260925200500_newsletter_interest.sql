-- Captura apenas interesse/consentimento. Nenhum envio é habilitado nesta etapa.
CREATE TABLE IF NOT EXISTS public.newsletter_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  person_name text NOT NULL,
  email text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'interested' CHECK (status IN ('interested', 'unsubscribed')),
  delivery_enabled boolean NOT NULL DEFAULT false,
  consent_text text NOT NULL,
  consent_version text NOT NULL,
  consent_at timestamptz NOT NULL DEFAULT now(),
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.newsletter_subscriptions TO service_role;
ALTER TABLE public.newsletter_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct newsletter access"
  ON public.newsletter_subscriptions FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

CREATE TABLE IF NOT EXISTS public.newsletter_throttle (
  fingerprint text PRIMARY KEY,
  attempts integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.newsletter_throttle TO service_role;
ALTER TABLE public.newsletter_throttle ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct newsletter throttle access"
  ON public.newsletter_throttle FOR ALL TO anon, authenticated
  USING (false) WITH CHECK (false);

-- Supabase may grant table privileges to public API roles by default.
-- RLS blocks row access, and this revoke also removes non-row privileges.
REVOKE ALL PRIVILEGES ON TABLE public.newsletter_subscriptions, public.newsletter_throttle FROM anon, authenticated;
