CREATE TABLE public.bikes(bike_id text PRIMARY KEY);
INSERT INTO public.bikes VALUES('test_bike');
CREATE SCHEMA storage;
CREATE TABLE storage.buckets(id text PRIMARY KEY,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
CREATE TABLE storage.objects(id uuid DEFAULT gen_random_uuid(),bucket_id text,name text,metadata jsonb,UNIQUE(bucket_id,name));
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT USAGE ON SCHEMA storage TO anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON storage.objects TO anon,authenticated;
-- Simulates pre-existing broad policies: the new bucket must still be protected.
CREATE POLICY existing_broad_policy ON storage.objects FOR ALL TO anon,authenticated USING(true) WITH CHECK(true);
INSERT INTO auth.users(id,email,email_confirmed_at) VALUES
('00000000-0000-4000-8000-000000000090','pilot@example.invalid',now()),
('00000000-0000-4000-8000-000000000091','other@example.invalid',now());
INSERT INTO public.member_profiles(user_id,display_name,privacy_version,privacy_acknowledged_at,community_joined_at)
VALUES('00000000-0000-4000-8000-000000000090','Piloto','v1',now(),now()),('00000000-0000-4000-8000-000000000091','Outro','v1',now(),now());
