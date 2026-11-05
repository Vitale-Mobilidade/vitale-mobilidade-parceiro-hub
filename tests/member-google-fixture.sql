ALTER TABLE auth.users ADD COLUMN encrypted_password text;
CREATE TABLE auth.identities(id uuid PRIMARY KEY DEFAULT gen_random_uuid(),user_id uuid REFERENCES auth.users(id),provider text,identity_data jsonb);
REVOKE ALL ON auth.identities FROM PUBLIC,anon,authenticated;
INSERT INTO auth.users(id,email,email_confirmed_at,raw_user_meta_data) VALUES
('00000000-0000-4000-8000-000000000092','google@example.invalid',now(),'{"email_verified":true}'),
('00000000-0000-4000-8000-000000000093','fake@example.invalid',now(),'{"email_verified":true,"provider":"google"}'),
('00000000-0000-4000-8000-000000000094','unverified-google@example.invalid',now(),'{}');
INSERT INTO public.member_profiles(user_id,display_name,privacy_version,privacy_acknowledged_at,community_joined_at) VALUES
('00000000-0000-4000-8000-000000000092','Pessoa Google','v1',now(),now()),
('00000000-0000-4000-8000-000000000093','Metadado forjado','v1',now(),now()),
('00000000-0000-4000-8000-000000000094','Claim inválido','v1',now(),now());
INSERT INTO auth.identities(user_id,provider,identity_data) VALUES
('00000000-0000-4000-8000-000000000092','google','{"email":"google@example.invalid","email_verified":true}'),
('00000000-0000-4000-8000-000000000094','google','{"email":"unverified-google@example.invalid","email_verified":false}');
