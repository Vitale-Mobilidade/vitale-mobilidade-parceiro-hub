-- Synthetic fixture only. Run in an isolated PostgreSQL-compatible database.
CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
CREATE TABLE newsletter_subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),person_name text,email text,status text DEFAULT 'interested',consent_version text DEFAULT 'v2',suppressed_at timestamptz,created_at timestamptz DEFAULT now(),delivery_enabled boolean DEFAULT false,resend_contact_id text,consent_at timestamptz DEFAULT now());
CREATE TABLE newsletter_campaigns (id uuid PRIMARY KEY DEFAULT gen_random_uuid(),resend_id text);
CREATE TABLE newsletter_recipients (campaign_id uuid,subscription_id uuid,excluded boolean DEFAULT false);
CREATE TABLE newsletter_webhook_events (event_id text PRIMARY KEY,event_type text,campaign_id uuid,email_id text);
CREATE TABLE newsletter_settings (singleton boolean,enabled boolean,last_error text);
ALTER TABLE newsletter_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON newsletter_webhook_events FROM PUBLIC,anon,authenticated;
