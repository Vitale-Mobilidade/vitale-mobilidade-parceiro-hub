CREATE POLICY member_media_read ON storage.objects FOR SELECT TO anon,authenticated
 USING(bucket_id='member-media' AND public.member_media_access(name,'select'));
CREATE POLICY member_media_upload ON storage.objects FOR INSERT TO authenticated
 WITH CHECK(bucket_id='member-media' AND public.member_media_access(name,'insert'));
CREATE POLICY member_media_delete ON storage.objects FOR DELETE TO authenticated
 USING(bucket_id='member-media' AND public.member_media_access(name,'delete'));
CREATE POLICY member_media_read_guard ON storage.objects AS RESTRICTIVE FOR SELECT TO anon,authenticated
 USING(bucket_id<>'member-media' OR public.member_media_access(name,'select'));
CREATE POLICY member_media_insert_guard ON storage.objects AS RESTRICTIVE FOR INSERT TO anon,authenticated
 WITH CHECK(bucket_id<>'member-media' OR public.member_media_access(name,'insert'));
CREATE POLICY member_media_update_guard ON storage.objects AS RESTRICTIVE FOR UPDATE TO anon,authenticated
 USING(bucket_id<>'member-media') WITH CHECK(bucket_id<>'member-media');
CREATE POLICY member_media_delete_guard ON storage.objects AS RESTRICTIVE FOR DELETE TO anon,authenticated
 USING(bucket_id<>'member-media' OR public.member_media_access(name,'delete'));